import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js";
import  {OrbitControls}  from '../../Models/OrbitControls.js';

const 	rendSize 	= new THREE.Vector2();
var container;
const loader = new GLTFLoader();
var 	scene,
		renderer,
		camera;
var gridSize = { x: 13, y: 4 }; // Tamanho da grade da pista (10x5)

var learningRate = 0.5; // Taxa de aprendizado
var discountFactor = 1.0; // Fator de desconto
var explorationRate = 0.2; // Taxa de exploração
var explorationRate_decay = 0.98;
var qTable = [];
var carMesh;
var track;
var car, buraco;
var carteste;
var texture, textureRoad, controlOrbit;
var path = [];
var box;
var trackAux = [];
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
	camera = new THREE.PerspectiveCamera(50, rendSize.x / rendSize.y, 1.0, 2000);
	camera.position.set(6,5, 18);



  texture 		= new THREE.TextureLoader().load("../../Models/hole2.png");
  textureRoad 		= new THREE.TextureLoader().load("../../Models/ativo.png");
  const trackGeometry = new THREE.PlaneGeometry(gridSize.x, gridSize.y + 1.0);
	const trackMaterial = new THREE.MeshBasicMaterial({ map:textureRoad });
	const track2 = new THREE.Mesh(trackGeometry, trackMaterial);
	scene.add(track2);
  track2.position.x += 6;
  track2.position.y -= 2;
  track2.position.z = 1.9;

  camera.updateProjectionMatrix();
  scene.rotation.y = 0.0;

  scene.rotation.x = -Math.PI/ 3 ;
  scene.rotation.z = 0.4;
	// criação dos buracos
  var holes = [];
	const obstacleGeometry = new THREE.PlaneGeometry(0.8, 0.8);
	const obstacleGeometryMaterial = new THREE.MeshBasicMaterial( { map:texture,
                                                                  transparent: true } );
	holes[0] = new THREE.Mesh(obstacleGeometry, obstacleGeometryMaterial);
	holes[0].position.set(4,0,2);

  holes[1] = holes[0].clone();
	holes[1].position.set(4,-1,2);

  holes[2] = holes[0].clone();
	holes[2].position.set(7,0,2);

  holes[3] = holes[0].clone();
	holes[3].position.set(9,-1,2);

  holes[4] = holes[0].clone();
	holes[4].position.set(9,-2,2);

  holes[5] = holes[0].clone();
	holes[5].position.set(11,-3,2);
  holes.forEach(item =>{
    scene.add(item);

  });

	initLights();
  loader.load('../Models/suv.glb', loadCar);

  track = [
    [1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1]
  ];

  trackAux = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];

  // Definir a tabela Q inicializada com zeros
  for (let x = 0; x < gridSize.x; x++) {
    qTable[x] = [];
    for (let y = 0; y < gridSize.y; y++) {
      qTable[x][y] = { right: 0, up: 0, down: 0 };
    }
  }
  renderer.render(scene, camera);
}
function loadCar(loadedCar){
	car = loadedCar.scene;
	car.traverse((o) => {
		if (o.isMesh){
			o.material.side = THREE.DoubleSide;
		} 
	  });
  resetCar();
	car.rotation.x = Math.PI / 2;
	car.rotation.y = -Math.PI/2;
  car.scale.set(0.5,0.5,0.3);
  car.position.z = 2;
	scene.add(car);
	box = new THREE.Box3().setFromObject(car);
  renderer.render(scene, camera);
}

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
// Função para verificar se uma célula contém um buraco
function isHole(x, y) {

  if(track[y][x] == 0){

    return true;
  }else{

    return false;
  }
}
// Função para escolher uma ação com base nos valores Q e na taxa de exploração
function chooseAction(position) {
  if (Math.random() < explorationRate) {
    // Exploração: escolhe uma ação aleatória
    var actions = Object.keys(qTable[position.x][position.y]);
    var randomIndex = Math.floor(Math.random() * actions.length);

    return actions[randomIndex];
  } else {
    // Exploração: escolhe a ação com maior valor Q
    var actions = Object.keys(qTable[position.x][position.y]);
    let maxQ = -Infinity;
    let bestAction = actions[0];
   
    actions.forEach(action => {
      var qValue = qTable[position.x][position.y][action];
      if (qValue > maxQ) {
        maxQ = qValue;
        bestAction = action;
      }
    });
    return bestAction;
  }
}
// Função para atualizar a tabela Q com base na transição de estado
function updateQTable(position, action, reward, nextPosition) {
  var currentQ = qTable[position.x][position.y][action];
  var maxNextQ = Math.max(...Object.values(qTable[nextPosition.x][nextPosition.y]));
  
  var updatedQ = (1 - learningRate) * currentQ + learningRate * (reward + discountFactor * maxNextQ);
  qTable[position.x][position.y][action] = updatedQ;
}
function resetCar(){
  car.position.set(0,0,0);
  renderer.render(scene, camera);
}

function resetMatrix(){
  for (var i = 0; i < 13; i++) {
    for (var j = 0; j < 4; j++) {

      trackAux[j][i] = 0;
    }
  }
}
// Função para treinar o agente usando o algoritmo Q-learning
function train() {
  const numEpisodes = 15; // Número de episódios de treinamento

  for (let episode = 0; episode < numEpisodes; episode++) {
    resetMatrix();
    let currentPosition = { x: 0, y: 0 }; // Posição inicial do carro

    while (currentPosition.x <= 12 ) {
      var action = chooseAction(currentPosition);
      let nextPosition = { x: currentPosition.x, y: currentPosition.y };
      trackAux[currentPosition.y][currentPosition.x] = 1;
      if (action === 'right' && currentPosition.x >= 0) {
        nextPosition.x++;
      } else if (action === 'up' && currentPosition.y > 0) {
        nextPosition.y--;
      } else if (action === 'down' && currentPosition.y < gridSize.y - 1) {
        nextPosition.y++;
      }
      
      var reward = isHole(nextPosition.x, nextPosition.y) ? -10 : 1; // Recompensa negativa se estiver buraco, se não recompensa = 1
      if((nextPosition.x == 13 && action === 'right') ){
        reward += 10;
        nextPosition = {x:0, y:0};
        updateQTable(currentPosition, action, reward,nextPosition );
        break;
      }
      if((currentPosition.y == 0 && action === 'up' ) || (currentPosition.y == 3 && action === 'down') ){ // recompensa negativa se a ação atual faz o agente sair da pista
        reward -= 10;
      }
      if(trackAux[nextPosition.y][nextPosition.x] == 1){ //Recompensa negativa se já visitou essa opção
        reward -= 10;
      }
      
      updateQTable(currentPosition, action, reward, nextPosition);

      currentPosition = nextPosition;
    }
    explorationRate *= explorationRate_decay;
  }
  console.log("Tabela Q treinada: ", qTable);
  runAgent();
}

// Função para executar o agente treinado e animar o carro na pista
function runAgent() {
  let currentPosition = { x: 0, y: 0 }; // Posição inicial do carro

  while(true){

    var actions = Object.keys(qTable[currentPosition.x][currentPosition.y]);
    let maxQ = -Infinity;
    let bestAction = actions[0];

    actions.forEach(action => {
      var qValue = qTable[currentPosition.x][currentPosition.y][action];
      if (qValue > maxQ) {
        maxQ = qValue;
        bestAction = action;
      }
    });
    let nextPosition = { x: currentPosition.x, y: currentPosition.y };

    if (bestAction === 'right' && currentPosition.x >= 0) {
      nextPosition.x++;
    } else if (bestAction === 'up' && currentPosition.y > 0) {
      nextPosition.y--;
    } else if (bestAction === 'down' && currentPosition.y < gridSize.y) {
      nextPosition.y++;
    }
    path.push(currentPosition);
    currentPosition = nextPosition;

   // updateCarPosition(currentPosition);
    
    if(currentPosition.x == 13){
      console.log("Caminho percorrido (já treinado): ", path);
      animateCar(path);
      break;
    }
  }

}
main();
// Iniciar o treinamento
train();


function animateCar() {

  var i=0;
    var id = setInterval(function() { 

      if(path[i].x <= 11){
        car.position.set(path[i].x, - path[i].y, 2);
        i++;
      }else{
        car.position.set(path[i].x, - path[i].y, 2);
        clearInterval(id);
      }
      renderer.render(scene, camera);
    }, 180);

}
//********************************** */