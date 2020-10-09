import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.112.1/build/three.module.js';
import {GUI} from 'https://cdn.jsdelivr.net/npm/three@0.112.1/examples/jsm/libs/dat.gui.module.js';
import {controls} from './controls.js';
import {game} from './game.js';
import {terrain} from './terrain.js';

let _APP = null;


class ProceduralTerrain_Demo extends game.Game {
  constructor() {
    super();
  }

  _OnInitialize() {
    this._CreateGUI();

    this._userCamera = new THREE.Object3D();
    this._userCamera.position.set(4100, 0, 0);
    this._graphics.Camera.position.set(3853, -609, -1509);
    this._graphics.Camera.quaternion.set(0.403, 0.59, -0.549, 0.432);

    this._graphics.Camera.position.set(1412, -1674, -3848);
    this._graphics.Camera.quaternion.set(0.1004, 0.7757, -0.6097, 0.1278);

    this._graphics.Camera.position.set(338810.64, -181800.18, -110710.19);
    this._graphics.Camera.quaternion.set(0.4275, 0.5715, -0.5616, 0.4183);
    // this._graphics.Camera.position.set(1367.34, -570.00, -3716.39);
    // this._graphics.Camera.quaternion.set(0.1287, 0.6021, -0.7815, 0.0992);

    this._graphics.Camera.position.set(338784.59, -181584.12, -110698.22);
    this._graphics.Camera.quaternion.set(0.4684, 0.5026, -0.6334, 0.3554);

    this._graphics.Camera.position.set(341783.13615310675, -225077.36034169965, -109485.53388079848);
    this._graphics.Camera.quaternion.set(0.39608344608128787, 0.5873476594328535, -0.5523018098171056, 0.4394352529916893);

    this._AddEntity('_terrain', new terrain.TerrainChunkManager({
        camera: this._graphics.Camera,
        scene: this._graphics.Scene,
        scattering: this._graphics._depthPass,
        gui: this._gui,
        guiParams: this._guiParams,
        game: this}), 1.0);

    this._AddEntity('_controls', new controls.FPSControls({
        camera: this._graphics.Camera,
        scene: this._graphics.Scene,
        domElement: this._graphics._threejs.domElement,
        gui: this._gui,
        guiParams: this._guiParams}), 0.0);

    // this._AddEntity('_controls', new controls.ShipControls({
    //     camera: this._graphics.Camera,
    //     scene: this._graphics.Scene,
    //     domElement: this._graphics._threejs.domElement,
    //     gui: this._gui,
    //     guiParams: this._guiParams,
    // }), 0.0);
  
    this._totalTime = 0;

    this._LoadBackground();
  }

  _CreateGUI() {
    this._guiParams = {
      general: {
      },
    };
    this._gui = new GUI();

    const generalRollup = this._gui.addFolder('General');
    this._gui.close();
  }

  _LoadBackground() {
    this._graphics.Scene.background = new THREE.Color(0x000000);
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
        './resources/space-posx.jpg',
        './resources/space-negx.jpg',
        './resources/space-posy.jpg',
        './resources/space-negy.jpg',
        './resources/space-posz.jpg',
        './resources/space-negz.jpg',
    ]);
    this._graphics._scene.background = texture;
  }

  _OnStep(timeInSeconds) {
  }
}


function _Main() {
  _APP = new ProceduralTerrain_Demo();
}

_Main();
