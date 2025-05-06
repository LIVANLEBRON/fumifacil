const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Función para ejecutar comandos
function runCommand(command, options = {}) {
  console.log(`${colors.cyan}Ejecutando: ${command}${colors.reset}`);
  try {
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    console.error(`${colors.red}Error al ejecutar: ${command}${colors.reset}`);
    console.error(error.message);
    return false;
  }
}

// Función para verificar si un archivo existe
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Función para verificar dependencias
function checkDependencies() {
  console.log(`${colors.bright}${colors.yellow}Verificando dependencias...${colors.reset}`);
  
  // Verificar Firebase CLI
  try {
    execSync('firebase --version', { stdio: 'pipe' });
    console.log(`${colors.green}✓ Firebase CLI instalado${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Firebase CLI no encontrado. Instálalo con: npm install -g firebase-tools${colors.reset}`);
    return false;
  }
  
  // Verificar Vercel CLI
  try {
    execSync('vercel --version', { stdio: 'pipe' });
    console.log(`${colors.green}✓ Vercel CLI instalado${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Vercel CLI no encontrado. Instálalo con: npm install -g vercel${colors.reset}`);
    return false;
  }
  
  return true;
}

// Función para verificar archivos de configuración
function checkConfigFiles() {
  console.log(`${colors.bright}${colors.yellow}Verificando archivos de configuración...${colors.reset}`);
  
  // Verificar .env
  if (!fileExists('.env')) {
    console.error(`${colors.red}✗ Archivo .env no encontrado. Crea uno basado en .env.example${colors.reset}`);
    return false;
  }
  console.log(`${colors.green}✓ Archivo .env encontrado${colors.reset}`);
  
  // Verificar firebase.json
  if (!fileExists('firebase.json')) {
    console.error(`${colors.red}✗ Archivo firebase.json no encontrado. Ejecuta: firebase init${colors.reset}`);
    return false;
  }
  console.log(`${colors.green}✓ Archivo firebase.json encontrado${colors.reset}`);
  
  // Verificar vercel.json
  if (!fileExists('vercel.json')) {
    console.error(`${colors.red}✗ Archivo vercel.json no encontrado${colors.reset}`);
    return false;
  }
  console.log(`${colors.green}✓ Archivo vercel.json encontrado${colors.reset}`);
  
  return true;
}

// Función para desplegar Cloud Functions
function deployFunctions() {
  console.log(`${colors.bright}${colors.yellow}Desplegando Cloud Functions...${colors.reset}`);
  
  // Instalar dependencias de las funciones
  console.log(`${colors.cyan}Instalando dependencias de las funciones...${colors.reset}`);
  if (!runCommand('cd functions && npm install')) {
    return false;
  }
  
  // Desplegar funciones
  console.log(`${colors.cyan}Desplegando funciones a Firebase...${colors.reset}`);
  if (!runCommand('firebase deploy --only functions')) {
    return false;
  }
  
  console.log(`${colors.green}✓ Cloud Functions desplegadas correctamente${colors.reset}`);
  return true;
}

// Función para desplegar la aplicación en Vercel
function deployToVercel() {
  console.log(`${colors.bright}${colors.yellow}Desplegando aplicación en Vercel...${colors.reset}`);
  
  // Construir la aplicación
  console.log(`${colors.cyan}Construyendo la aplicación...${colors.reset}`);
  if (!runCommand('npm run build')) {
    return false;
  }
  
  // Desplegar a Vercel
  console.log(`${colors.cyan}Desplegando a Vercel...${colors.reset}`);
  if (!runCommand('vercel --prod')) {
    return false;
  }
  
  console.log(`${colors.green}✓ Aplicación desplegada correctamente en Vercel${colors.reset}`);
  return true;
}

// Función principal
async function main() {
  console.log(`${colors.bright}${colors.green}=== Script de Despliegue para FumiFacil ====${colors.reset}\n`);
  
  // Verificar dependencias y archivos de configuración
  if (!checkDependencies() || !checkConfigFiles()) {
    console.error(`${colors.red}Error: Verifica los requisitos antes de continuar${colors.reset}`);
    process.exit(1);
  }
  
  // Preguntar qué desplegar
  rl.question(`${colors.yellow}¿Qué deseas desplegar? (1: Todo, 2: Solo Functions, 3: Solo Vercel): ${colors.reset}`, (answer) => {
    switch (answer.trim()) {
      case '1':
        // Desplegar todo
        if (deployFunctions()) {
          deployToVercel();
        }
        break;
      case '2':
        // Solo Functions
        deployFunctions();
        break;
      case '3':
        // Solo Vercel
        deployToVercel();
        break;
      default:
        console.error(`${colors.red}Opción no válida${colors.reset}`);
    }
    
    rl.close();
  });
}

// Ejecutar script
main().catch((error) => {
  console.error(`${colors.red}Error inesperado:${colors.reset}`, error);
  process.exit(1);
});
