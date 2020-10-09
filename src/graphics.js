import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.112.1/build/three.module.js';
import Stats from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/libs/stats.module.js';
import {WEBGL} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/WebGL.js';

import {RenderPass} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/postprocessing/ShaderPass.js';
import {CopyShader} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/shaders/CopyShader.js';
import {FXAAShader} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/shaders/FXAAShader.js';
import {EffectComposer} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/postprocessing/EffectComposer.js';

import {scattering_shader} from './scattering-shader.js';


export const graphics = (function() {

  function _GetImageData(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const context = canvas.getContext( '2d' );
    context.drawImage(image, 0, 0);

    return context.getImageData(0, 0, image.width, image.height);
  }

  function _GetPixel(imagedata, x, y) {
    const position = (x + imagedata.width * y) * 4;
    const data = imagedata.data;
    return {
        r: data[position],
        g: data[position + 1],
        b: data[position + 2],
        a: data[position + 3]
    };
  }

  class _Graphics {
    constructor(game) {
    }

    Initialize() {
      if (!WEBGL.isWebGL2Available()) {
        return false;
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2', {alpha: false});

      this._threejs = new THREE.WebGLRenderer({
        canvas: canvas,
        context: context,
      });
      this._threejs.setPixelRatio(window.devicePixelRatio);
      this._threejs.setSize(window.innerWidth, window.innerHeight);
      this._threejs.autoClear = false;

      const target = document.getElementById('target');
      target.appendChild(this._threejs.domElement);

      this._stats = new Stats();
      // target.appendChild(this._stats.dom);

      window.addEventListener('resize', () => {
        this._OnWindowResize();
      }, false);

      const fov = 60;
      const aspect = 1920 / 1080;
      const near = 1.0;
      const far = 1000000.0;
      this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      this._camera.position.set(75, 20, 0);

      this._scene = new THREE.Scene();
      this._scene.background = new THREE.Color(0xaaaaaa);

      const renderPass = new RenderPass(this._scene, this._camera);
      const fxaaPass = new ShaderPass(FXAAShader);
      // const depthPass = new ShaderPass(scattering_shader.Shader);

      // this._depthPass = depthPass;

      this._composer = new EffectComposer(this._threejs);
      this._composer.addPass(renderPass);
      this._composer.addPass(fxaaPass);
      //this._composer.addPass(depthPass);

      this._target = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
      this._target.texture.format = THREE.RGBFormat;
      this._target.texture.minFilter = THREE.NearestFilter;
      this._target.texture.magFilter = THREE.NearestFilter;
      this._target.texture.generateMipmaps = false;
      this._target.stencilBuffer = false;
      this._target.depthBuffer = true;
      this._target.depthTexture = new THREE.DepthTexture();
      this._target.depthTexture.format = THREE.DepthFormat;
      this._target.depthTexture.type = THREE.FloatType;

      this._threejs.setRenderTarget(this._target);

      this._postCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
      this._depthPass = new THREE.ShaderMaterial( {
        vertexShader: scattering_shader.VS,
        fragmentShader: scattering_shader.PS,
        uniforms: {
          cameraNear: { value: this.Camera.near },
          cameraFar: { value: this.Camera.far },
          cameraPosition: { value: this.Camera.position },
          cameraForward: { value: null },
          tDiffuse: { value: null },
          tDepth: { value: null },
          inverseProjection: { value: null },
          inverseView: { value: null },
          planetPosition: { value: null },
          planetRadius: { value: null },
          atmosphereRadius: { value: null },
        }
      } );
      var postPlane = new THREE.PlaneBufferGeometry( 2, 2 );
      var postQuad = new THREE.Mesh( postPlane, this._depthPass );
      this._postScene = new THREE.Scene();
      this._postScene.add( postQuad );

      this._CreateLights();

      return true;
    }


    _CreateLights() {
      let light = new THREE.DirectionalLight(0xFFFFFF, 1);
      light.position.set(100, 100, -100);
      light.target.position.set(0, 0, 0);
      light.castShadow = false;
      this._scene.add(light);

      light = new THREE.DirectionalLight(0x404040, 1);
      light.position.set(100, 100, -100);
      light.target.position.set(0, 0, 0);
      light.castShadow = false;
      this._scene.add(light);

      light = new THREE.DirectionalLight(0x404040, 1);
      light.position.set(100, 100, -100);
      light.target.position.set(0, 0, 0);
      light.castShadow = false;
      this._scene.add(light);

      light = new THREE.DirectionalLight(0x202040, 1);
      light.position.set(100, -100, 100);
      light.target.position.set(0, 0, 0);
      light.castShadow = false;
      this._scene.add(light);

      light = new THREE.AmbientLight(0xFFFFFF, 1.0);
      this._scene.add(light);
    }

    _OnWindowResize() {
      this._camera.aspect = window.innerWidth / window.innerHeight;
      this._camera.updateProjectionMatrix();
      this._threejs.setSize(window.innerWidth, window.innerHeight);
      this._composer.setSize(window.innerWidth, window.innerHeight);
      this._target.setSize(window.innerWidth, window.innerHeight);
    }

    get Scene() {
      return this._scene;
    }

    get Camera() {
      return this._camera;
    }

    Render(timeInSeconds) {
      this._threejs.setRenderTarget(this._target);

      this._threejs.clear();
      this._threejs.render(this._scene, this._camera);
      //this._composer.render();

      this._threejs.setRenderTarget( null );

      const forward = new THREE.Vector3();
      this._camera.getWorldDirection(forward);

      this._depthPass.uniforms.inverseProjection.value = this._camera.projectionMatrixInverse;
      this._depthPass.uniforms.inverseView.value = this._camera.matrixWorld;
      this._depthPass.uniforms.tDiffuse.value = this._target.texture;
      this._depthPass.uniforms.tDepth.value = this._target.depthTexture;
      this._depthPass.uniforms.cameraNear.value = this._camera.near;
      this._depthPass.uniforms.cameraFar.value = this._camera.far;
      this._depthPass.uniforms.cameraPosition.value = this._camera.position;
      this._depthPass.uniforms.cameraForward.value = forward;
      this._depthPass.uniforms.planetPosition.value = new THREE.Vector3(0, 0, 0);
      this._depthPass.uniformsNeedUpdate = true;

      this._threejs.render( this._postScene, this._postCamera );

      this._stats.update();
    }
  }

  return {
    Graphics: _Graphics,
    GetPixel: _GetPixel,
    GetImageData: _GetImageData,
  };
})();
