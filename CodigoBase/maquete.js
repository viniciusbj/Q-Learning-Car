import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.121.1/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js";

const 	rendSize 	= new THREE.Vector2();
var container;
const loader = new GLTFLoader();
var 	scene,
		renderer,
		camera;

var gridSize = { x: 13, y: 4 }; // Tamanho da grade da pista (10x5)
//var carColor = 0x00ff00; // Cor do carro
var learningRate = 0.5; // Taxa de aprendizado
var discountFactor = 1.0; // Fator de desconto
var explorationRate = 0.2; // Taxa de exploração
var explorationRate_decay = 0.98;
var qTable = [];
var carMesh;
var track;
var car, buraco;
var carteste;
var box;
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
	camera = new THREE.PerspectiveCamera(50, rendSize.x / rendSize.y, 10.0, 2000);
	camera.position.set(6, 0, 15);

  const trackGeometry = new THREE.PlaneGeometry(gridSize.x, gridSize.y + 1.0);
	const trackMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
	const track2 = new THREE.Mesh(trackGeometry, trackMaterial);
	scene.add(track2);
  track2.position.x += 6;
  track2.position.y -= 2;

	// criação dos buracos
	const obstacleGeometry = new THREE.PlaneGeometry(0.3, 0.3);
	const obstacleGeometryMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF });
	buraco = new THREE.Mesh(obstacleGeometry, obstacleGeometryMaterial);
	buraco.position.set(4,0,0);
	scene.add(buraco);

	initLights();
  //loader.load('../Models/suv.glb', loadCar);

	carteste = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ color: 0xFFFF }));
	carteste.position.set(0,0,0);
	scene.add(carteste);

  track = [
    [1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  ];
  
  // Definir a tabela Q inicializada com zeros
  for (let x = 0; x < gridSize.x; x++) {
    qTable[x] = [];
    for (let y = 0; y < gridSize.y; y++) {
      qTable[x][y] = { right: 0, up: 0, down: 0 };
    }
  }
  renderer.render(scene, camera);
//  renderExternal();
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
	car.rotation.y = -Math.PI/2;
  car.scale.set(0.5,0.5,0.3);
	//scene.add(car);
	box = new THREE.Box3().setFromObject(car);

	//renderExternal();

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
function itsOut(x,y){
  if(x < 0 || y <0){
    return true;
  }else{
    return false;
  }
}
  
// Função para atualizar a posição do carro na cena
function updateCarPosition(pos) {

  renderer.setAnimationLoop( function () {

      carteste.position.set(pos.x,  - pos.y, 0);

    renderer.render( scene, camera );
  } );

//  renderer.render(scene, camera);
 // camera.updateProjectionMatrix();
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
  carteste.position.set(0,0,0);
}
// Função para treinar o agente usando o algoritmo Q-learning
function train() {
  const numEpisodes = 60; // Número de episódios de treinamento

  for (let episode = 0; episode < numEpisodes; episode++) {
    let currentPosition = { x: 0, y: 0 }; // Posição inicial do carro
    resetCar();

    while (currentPosition.x < 12 ) {
      var action = chooseAction(currentPosition);

      let nextPosition = { x: currentPosition.x, y: currentPosition.y };

      if (action === 'right' && currentPosition.x >= 0) {
        nextPosition.x++;
      } else if (action === 'up' && currentPosition.y > 0) {
        nextPosition.y--;
      } else if (action === 'down' && currentPosition.y < gridSize.y - 1) {
        nextPosition.y++;
      }
      var reward = isHole(nextPosition.x, nextPosition.y) ? -10 : 1;
      if((currentPosition.y == 0 && action === 'up' ) || (currentPosition.y == 3 && action === 'down') ){
        reward -= 10;
      }
    
      updateQTable(currentPosition, action, reward, nextPosition);

      currentPosition = nextPosition;
    }
    explorationRate *= explorationRate_decay;
  }
  console.log(qTable);
 // runAgent();
}

// Função para executar o agente treinado e animar o carro na pista
function runAgent() {
  let currentPosition = { x: 0, y: 0 }; // Posição inicial do carro

  while(true){

    var actions = Object.keys(qTable[currentPosition.x][currentPosition.y]);
    console.log(actions);
    let maxQ = -Infinity;
    let bestAction = actions[0];

    actions.forEach(action => {
      var qValue = qTable[currentPosition.x][currentPosition.y][action];
      if (qValue > maxQ) {
        maxQ = qValue;
        bestAction = action;
      }
    });
    console.log(bestAction);
    let nextPosition = { x: currentPosition.x, y: currentPosition.y };

    if (bestAction === 'right' && currentPosition.x >= 0) {
      nextPosition.x++;
    } else if (bestAction === 'up' && currentPosition.y > 0) {
      nextPosition.y--;
    } else if (bestAction === 'down' && currentPosition.y < gridSize.y) {
      nextPosition.y++;
    }
      console.log("posicao atual", currentPosition);
      currentPosition = nextPosition;
      console.log("proxima posicao", currentPosition);
      // Atualiza a posição do carro
    updateCarPosition(currentPosition);
    
    if(currentPosition.x == 2){
      break;
    }
  }

}
main();
// Iniciar o treinamento
train();

// Executar o agente treinado



function renderExternal() {

 // car.position.x += 0.001;
  renderer.render(scene, camera);
  requestAnimationFrame(renderExternal);
}

