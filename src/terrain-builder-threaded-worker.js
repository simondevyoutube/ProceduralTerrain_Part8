import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.112.1/build/three.module.js';

import {noise} from './noise.js';
import {texture_splatter} from './texture-splatter.js' ;


class _TerrainBuilderThreadedWorker {
  constructor() {
  }

  Init(params) {
    this._params = params;
    this._params.offset = new THREE.Vector3(
        params.offset[0], params.offset[1], params.offset[2]);
    this._params.noise = new noise.Noise(params.noiseParams);
    this._params.heightGenerators = [
        new texture_splatter.HeightGenerator(
            this._params.noise, params.offset,
            params.heightGeneratorsParams.min, params.heightGeneratorsParams.max)
    ];

    this._params.biomeGenerator = new noise.Noise(params.biomesParams);
    this._params.colourNoise = new noise.Noise(params.colourNoiseParams);
    this._params.colourGenerator = new texture_splatter.TextureSplatter(
        {
          biomeGenerator: this._params.biomeGenerator,
          colourNoise: this._params.colourNoise
        });
  }

  _GenerateHeight(v) {
    return this._params.heightGenerators[0].Get(v.x, v.y, v.z)[0];
  }

  Rebuild() {
    const _D = new THREE.Vector3();
    const _D1 = new THREE.Vector3();
    const _D2 = new THREE.Vector3();
    const _P = new THREE.Vector3();
    const _H = new THREE.Vector3();
    const _W = new THREE.Vector3();
    const _S = new THREE.Vector3();
    const _C = new THREE.Vector3();

    const _N = new THREE.Vector3();
    const _N1 = new THREE.Vector3();
    const _N2 = new THREE.Vector3();
    const _N3 = new THREE.Vector3();

    const positions = [];
    const colors = [];
    const up = [];
    const coords = [];
    const uvs = [];
    const weights1 = [];
    const weights2 = [];
    const indices = [];
    const wsPositions = [];

    const localToWorld = this._params.worldMatrix;
    const resolution = this._params.resolution;
    const radius = this._params.radius;
    const offset = this._params.offset;
    const origin = this._params.origin;
    const width = this._params.width;
    const half = width / 2;

    for (let x = 0; x < resolution + 1; x++) {
      const xp = width * x / resolution;
      for (let y = 0; y < resolution + 1; y++) {
        const yp = width * y / resolution;

        // Compute position
        _P.set(xp - half, yp - half, radius);
        _P.add(offset);
        _P.normalize();
        _D.copy(_P);
        _D.transformDirection(localToWorld);

        _P.multiplyScalar(radius);
        _P.z -= radius;
        _P.applyMatrix4(localToWorld);

        // Keep the absolute world space position to sample noise
        _W.copy(_P);

        // Move the position relative to the origin
        _P.sub(origin);

        // Purturb height along z-vector
        const height = this._GenerateHeight(_W);
        _H.copy(_D);
        _H.multiplyScalar(height);
        _P.add(_H);

        positions.push(_P.x, _P.y, _P.z);

        _C.copy(_W);
        _C.add(_H);
        coords.push(_C.x, _C.y, _C.z);

        _S.set(_W.x, _W.y, height);

        const color = this._params.colourGenerator.GetColour(_S);
        colors.push(color.r, color.g, color.b);
        up.push(_D.x, _D.y, _D.z);
        wsPositions.push(_W.x, _W.y, height);
        // TODO GUI
        uvs.push(_P.x / 200.0, _P.y / 200.0);
      }
    }

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        indices.push(
            i * (resolution + 1) + j,
            (i + 1) * (resolution + 1) + j + 1,
            i * (resolution + 1) + j + 1);
        indices.push(
            (i + 1) * (resolution + 1) + j,
            (i + 1) * (resolution + 1) + j + 1,
            i * (resolution + 1) + j);
      }
    }

    const normals = new Array(up.length).fill(0.0);

    for (let i = 0, n = indices.length; i < n; i+= 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i+1] * 3;
      const i3 = indices[i+2] * 3;

      _N1.fromArray(positions, i1);
      _N2.fromArray(positions, i2);
      _N3.fromArray(positions, i3);

      _D1.subVectors(_N3, _N2);
      _D2.subVectors(_N1, _N2);
      _D1.cross(_D2);

      normals[i1] += _D1.x;
      normals[i2] += _D1.x;
      normals[i3] += _D1.x;

      normals[i1+1] += _D1.y;
      normals[i2+1] += _D1.y;
      normals[i3+1] += _D1.y;

      normals[i1+2] += _D1.z;
      normals[i2+2] += _D1.z;
      normals[i3+2] += _D1.z;
    }

    for (let i = 0, n = normals.length; i < n; i+=3) {
      _N.fromArray(normals, i);
      _N.normalize();
      normals[i] = _N.x;
      normals[i+1] = _N.y;
      normals[i+2] = _N.z;
    }

    for (let i = 0, n = indices.length; i < n; i+=3) {
      const splats = [];
      const i1 = indices[i] * 3;
      const i2 = indices[i+1] * 3;
      const i3 = indices[i+2] * 3;
      const indexes = [i1, i2, i3];
      for (let j = 0; j < 3; j++) {
        const j1 = indexes[j];
        _P.fromArray(wsPositions, j1);
        _N.fromArray(normals, j1);
        _D.fromArray(up, j1);
        const s = this._params.colourGenerator.GetSplat(_P, _N, _D);
        splats.push(s);
      }

      const splatStrengths = {};
      for (let k in splats[0]) {
        splatStrengths[k] = {key: k, strength: 0.0};
      }
      for (let curSplat of splats) {
        for (let k in curSplat) {
          splatStrengths[k].strength += curSplat[k].strength;
        }
      }

      let typeValues = Object.values(splatStrengths);
      typeValues.sort((a, b) => {
        if (a.strength < b.strength) {
          return 1;
        }
        if (a.strength > b.strength) {
          return -1;
        }
        return 0;
      });

      const w1 = indices[i] * 4;
      const w2 = indices[i+1] * 4;
      const w3 = indices[i+2] * 4;

      for (let s = 0; s < 3; s++) {
        let total = (
            splats[s][typeValues[0].key].strength +
            splats[s][typeValues[1].key].strength +
            splats[s][typeValues[2].key].strength +
            splats[s][typeValues[3].key].strength);
        const normalization = 1.0 / total;

        splats[s][typeValues[0].key].strength *= normalization;
        splats[s][typeValues[1].key].strength *= normalization;
        splats[s][typeValues[2].key].strength *= normalization;
        splats[s][typeValues[3].key].strength *= normalization;
      }

      weights1.push(splats[0][typeValues[3].key].index);
      weights1.push(splats[0][typeValues[2].key].index);
      weights1.push(splats[0][typeValues[1].key].index);
      weights1.push(splats[0][typeValues[0].key].index);

      weights1.push(splats[1][typeValues[3].key].index);
      weights1.push(splats[1][typeValues[2].key].index);
      weights1.push(splats[1][typeValues[1].key].index);
      weights1.push(splats[1][typeValues[0].key].index);

      weights1.push(splats[2][typeValues[3].key].index);
      weights1.push(splats[2][typeValues[2].key].index);
      weights1.push(splats[2][typeValues[1].key].index);
      weights1.push(splats[2][typeValues[0].key].index);

      weights2.push(splats[0][typeValues[3].key].strength);
      weights2.push(splats[0][typeValues[2].key].strength);
      weights2.push(splats[0][typeValues[1].key].strength);
      weights2.push(splats[0][typeValues[0].key].strength);

      weights2.push(splats[1][typeValues[3].key].strength);
      weights2.push(splats[1][typeValues[2].key].strength);
      weights2.push(splats[1][typeValues[1].key].strength);
      weights2.push(splats[1][typeValues[0].key].strength);

      weights2.push(splats[2][typeValues[3].key].strength);
      weights2.push(splats[2][typeValues[2].key].strength);
      weights2.push(splats[2][typeValues[1].key].strength);
      weights2.push(splats[2][typeValues[0].key].strength);
    }

    function _Unindex(src, stride) {
      const dst = [];
      for (let i = 0, n = indices.length; i < n; i+= 3) {
        const i1 = indices[i] * stride;
        const i2 = indices[i+1] * stride;
        const i3 = indices[i+2] * stride;

        for (let j = 0; j < stride; j++) {
          dst.push(src[i1 + j]);
        }
        for (let j = 0; j < stride; j++) {
          dst.push(src[i2 + j]);
        }
        for (let j = 0; j < stride; j++) {
          dst.push(src[i3 + j]);
        }
      }
      return dst;
    }

    const uiPositions = _Unindex(positions, 3);
    const uiColours = _Unindex(colors, 3);
    const uiNormals = _Unindex(normals, 3);
    const uiCoords = _Unindex(coords, 3);
    const uiUVs = _Unindex(uvs, 2);
    const uiWeights1 = weights1;
    const uiWeights2 = weights2;

    const bytesInFloat32 = 4;
    const positionsArray = new Float32Array(
        new SharedArrayBuffer(bytesInFloat32 * uiPositions.length));
    const coloursArray = new Float32Array(
        new SharedArrayBuffer(bytesInFloat32 * uiColours.length));
    const normalsArray = new Float32Array(
        new SharedArrayBuffer(bytesInFloat32 * uiNormals.length));
    const coordsArray = new Float32Array(
        new SharedArrayBuffer(bytesInFloat32 * uiCoords.length));
    const uvsArray = new Float32Array(
        new SharedArrayBuffer(bytesInFloat32 * uiUVs.length));
    const weights1Array = new Float32Array(
        new SharedArrayBuffer(bytesInFloat32 * uiWeights2.length));
    const weights2Array = new Float32Array(
        new SharedArrayBuffer(bytesInFloat32 * uiWeights2.length));

    positionsArray.set(uiPositions, 0);
    coloursArray.set(uiColours, 0);
    normalsArray.set(uiNormals, 0);
    uvsArray.set(uiUVs, 0);
    coordsArray.set(uiCoords, 0);
    weights1Array.set(uiWeights1, 0);
    weights2Array.set(uiWeights2, 0);

    return {
      positions: positionsArray,
      colours: coloursArray,
      uvs: uvsArray,
      normals: normalsArray,
      coords: coordsArray,
      weights1: weights1Array,
      weights2: weights2Array,
    };
  }
}

const _CHUNK = new _TerrainBuilderThreadedWorker();

self.onmessage = (msg) => {
  if (msg.data.subject == 'build_chunk') {
    _CHUNK.Init(msg.data.params);

    const rebuiltData = _CHUNK.Rebuild();
    self.postMessage({subject: 'build_chunk_result', data: rebuiltData});
  }
}