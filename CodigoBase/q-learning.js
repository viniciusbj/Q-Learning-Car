
const numStates = 3; // Número de estados possíveis (cima, baixo, esquerda)
const numActions = 3; // Número de ações possíveis (cima, baixo, esquerda)
const learningRate = 0.1; // Taxa de aprendizado
const discountRate = 0.99; // Taxa de desconto
const numEpisodes = 1000; // Número de episódios de treinamento





export function main(){
    const qTable = tf.zeros([numStates, numActions]);
    console.log(qTable);
}
export function chooseAction(state) {
    if (Math.random() < 0.2) {
      return Math.floor(Math.random() * numActions); // Ação aleatória
    } else {
      const stateRow = qTable.slice([state, 0], [1, numActions]);
      return tf.argMax(stateRow, 1).dataSync()[0]; // Ação com maior valor Q
    }
  }

export function updateQTable(state, action, reward, nextState) {
    const stateRow = qTable.slice([state, 0], [1, numActions]);
    const nextStateRow = qTable.slice([nextState, 0], [1, numActions]);
    const maxNextStateQ = tf.max(nextStateRow);
    const targetQ = reward + discountRate * maxNextStateQ;
    const error = targetQ.sub(stateRow.get([0, action]));
  
    const updatedQValue = stateRow.get([0, action]).add(learningRate * error);
    qTable.tensor.set(updatedQValue, [state, action]);
}
function train() {
    for (let episode = 0; episode < numEpisodes; episode++) {
      let currentState = 1; // Estado inicial: reta
  
      while (true) {
        const action = chooseAction(currentState);
  
        let nextState;
        let reward;
  
        if (action === 0) {
          nextState = 0; // Movimento para a esquerda
          reward = obstacles.some(obstacle => obstacle.position.x < car.position.x + 1 && obstacle.position.x > car.position.x - 1) ? -1 : 0;
        } else if (action === 1) {
          nextState = 2; // Movimento para a direita
          reward = obstacles.some(obstacle => obstacle.position.x < car.position.x + 1 && obstacle.position.x > car.position.x - 1) ? -1 : 0;
        } else {
          nextState = 1; // Permanecer em linha reta
          reward = obstacles.some(obstacle => obstacle.position.x < car.position.x + 1 && obstacle.position.x > car.position.x - 1) ? -10 : 0;
        }
  
        updateQTable(currentState, action, reward, nextState);
        currentState = nextState;
  
        updateObstacles();
  
        // Movimenta o carro
        if (action === 0) {
          car.position.x -= 0.1; // Movimento para a esquerda
        } else if (action === 1) {
          car.position.x += 0.1; // Movimento para a direita
        }
  
        renderer.render(scene, camera);
  
        // Verifica se o carro colidiu com algum obstáculo
        const collision = obstacles.some(obstacle => obstacle.position.x < car.position.x + 0.5 && obstacle.position.x > car.position.x - 0.5);
        if (collision) {
          console.log('Colisão! Reiniciando episódio...');
          break;
        }
      }
    }
  
    console.log('Treinamento concluído.');
  }