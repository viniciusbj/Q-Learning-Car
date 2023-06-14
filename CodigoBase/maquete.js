import * as THREE 	from 'three';
import { GLTFLoader } from '../../Assets/scripts/three.js/examples/jsm/loaders/GLTFLoader.js';
import { GUI } 		from '../../Assets/scripts/three.js/examples/jsm/libs/lil-gui.module.min.js';

import * as qLearning from './q-learning.js';

// VARIAVEIS
const loader = new GLTFLoader();

const 	clock 			= new THREE.Clock();
const 	rendSize 	= new THREE.Vector2();

var 	scene,
		renderer,
		camera;

var container;
var gui = new GUI({ autoPlace: true });
var car;


// ****************

const numStates = 3; // Número de estados possíveis (cima, baixo, esquerda)
const numActions = 3; // Número de ações possíveis (cima, baixo, esquerda)
const learningRate = 0.1; // Taxa de aprendizado
const discountRate = 0.99; // Taxa de desconto
const numEpisodes = 10; // Número de episódios de treinamento

const qTable = tf.zeros([numStates, numActions]);
// **************
var buraco;

// ****** FUNCTIONS ******

function main() {

	renderer = new THREE.WebGLRenderer({ antialias: true } );
	renderer.setClearColor(new THREE.Color(0.0, 0.0, 0.0));
    renderer.setPixelRatio( window.devicePixelRatio );

	rendSize.x = rendSize.y = Math.min(window.innerWidth, window.innerHeight);
	renderer.setSize(rendSize.x * 1.3, rendSize.y / 1.4);
	container = document.getElementById( 'threejs-canvas' );
	document.body.appendChild(container);
	container.appendChild( renderer.domElement );

	scene 	= new THREE.Scene();
	camera = new THREE.PerspectiveCamera(75, rendSize.x / rendSize.y, 0.1, 2000);
	camera.position.set(0, 0, 15);

	gui.domElement.id = 'gui';

	const trackGeometry = new THREE.PlaneGeometry(100, 10);
	const trackMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
	const track = new THREE.Mesh(trackGeometry, trackMaterial);
	scene.add(track);

	// criação dos buracos
	const obstacleGeometry = new THREE.PlaneGeometry(0.3, 0.3);
	const obstacleGeometryMaterial = new THREE.MeshBasicMaterial({ color: 0x00008 });
	buraco = new THREE.Mesh(obstacleGeometry, obstacleGeometryMaterial);
	buraco.position.set(-10,0,0);
	scene.add(buraco);

	initLights();
	loader.load('../Models/suv.glb', loadCar);
	
	renderer.clear();

}
function loadCar(loadedCar){

	
	car = loadedCar.scene;
	car.traverse((o) => {
		if (o.isMesh){
			o.material.side = THREE.DoubleSide;
		} 
	  });
	car.position.set(0,0,0);
	car.rotation.x = Math.PI / 2;
	car.rotation.y = Math.PI/2;
	scene.add(car);
	const box = new THREE.Box3().setFromObject(car);
	camera.updateProjectionMatrix();
	
	renderExternal();
}
// ****** INITIALIZERS ******
function initLights(){
    const ambientLight = new THREE.AmbientLight( 0xffffff, 0.4 );
   scene.add( ambientLight );
    
	const dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
	dirLight.color.setHSL( 0.1, 1, 0.95 );
	dirLight.position.set( - 1, 1.75, 1 );
	dirLight.position.multiplyScalar( 30 );
	scene.add( dirLight );

	const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
	hemiLight.color.setHSL( 0.6, 1, 0.6 );
	hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
	hemiLight.position.set( 0, 50, 0 );
	scene.add( hemiLight );


}

function reset(){
	car.position.set(0,0,0);
}
function checkCollision() {
	
	if(car.position.distanceTo(buraco.position) < 2.0){
		reset();
		return true;

	}else{
		return false;
	}
  }
function renderExternal() {

		if(!checkCollision()){
			car.position.x -= 0.02;
		}	
		renderer.render(scene, camera);
		requestAnimationFrame(renderExternal);
}




main();