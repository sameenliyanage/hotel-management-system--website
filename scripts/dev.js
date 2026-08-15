const { spawn } = require('child_process');
const net = require('net');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const candidatePorts = [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008];

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' });

    socket.setTimeout(500);

    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => resolve(false));
  });
}

async function findFreePort() {
  for (const port of candidatePorts) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await isPortOpen(port))) {
      return port;
    }
  }

  return 3009;
}

function startProcess(command, args, cwd, env, label) {
  const child = spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });

  child.on('exit', (code) => {
    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}`);
      process.exitCode = code;
    }
  });

  return child;
}

async function main() {
  const backendPort = await findFreePort();
  const viteBin = path.join(repoRoot, 'client', 'node_modules', 'vite', 'bin', 'vite.js');

  const backend = startProcess(process.execPath, [path.join(repoRoot, 'server.js')], repoRoot, { PORT: String(backendPort) }, 'Backend');
  const frontend = startProcess(
    process.execPath,
    [viteBin],
    path.join(repoRoot, 'client'),
    { VITE_API_BASE_URL: `http://localhost:${backendPort}/api` },
    'Frontend',
  );

  function shutdown(signal) {
    backend.kill(signal);
    frontend.kill(signal);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  console.log(`Using backend port ${backendPort}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});