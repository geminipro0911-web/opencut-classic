const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');
const fs = require('fs');

let serverProcess = null;
let mainWindow = null;
const PORT = 34567;
let serverLogs = '';

function findServerScript() {
  const candidates = [
    path.join(__dirname, 'standalone', 'apps', 'web', 'server.js'),
    path.join(__dirname, 'standalone', 'server.js'),
    path.join(process.resourcesPath, 'app', 'standalone', 'apps', 'web', 'server.js'),
    path.join(process.resourcesPath, 'app', 'standalone', 'server.js'),
    path.join(process.resourcesPath, 'standalone', 'apps', 'web', 'server.js'),
    path.join(process.resourcesPath, 'standalone', 'server.js'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch (e) {}
  }
  return null;
}

function startServer() {
  const serverPath = findServerScript();
  if (!serverPath) {
    dialog.showErrorBox(
      'Khởi động thất bại',
      'Không tìm thấy file server.js nội bộ trong bản đóng gói.\nĐã kiểm tra tại: ' + __dirname
    );
    app.quit();
    return;
  }

  const serverDir = path.dirname(serverPath);

  // Quan trọng: Bắt buộc phải có ELECTRON_RUN_AS_NODE = '1' để Electron chạy file script như Node.js
  serverProcess = fork(serverPath, [], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: PORT.toString(),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });

  if (serverProcess.stdout) {
    serverProcess.stdout.on('data', (d) => {
      serverLogs += d.toString();
    });
  }

  if (serverProcess.stderr) {
    serverProcess.stderr.on('data', (d) => {
      serverLogs += d.toString();
    });
  }

  serverProcess.on('error', (err) => {
    serverLogs += '\nServer Process Error: ' + err.message;
  });

  serverProcess.on('exit', (code, signal) => {
    serverLogs += `\nServer Process exited unexpectedly with code ${code}, signal ${signal}`;
  });
}

function waitForServer(url, maxRetries = 60, interval = 500) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      const req = http.get(url, (res) => {
        resolve();
      });

      req.on('error', (err) => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error(
            'Máy chủ nội bộ không phản hồi sau thời gian chờ.\n\nChi tiết log server:\n' +
            (serverLogs || 'Không có log từ tiến trình server.')
          ));
        } else {
          setTimeout(check, interval);
        }
      });
    };
    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'OpenCut Video Editor',
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}/projects`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1:') || url.startsWith('http://localhost:')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startServer();
  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    createWindow();
  } catch (err) {
    dialog.showErrorBox('Lỗi kết nối', err.message);
    app.quit();
  }
});

function cleanup() {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {}
    serverProcess = null;
  }
}

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanup();
});
