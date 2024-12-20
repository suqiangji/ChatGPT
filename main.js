const { app, BrowserWindow, dialog, BrowserView, globalShortcut } = require("electron");
const path = require("path");

const CHATGPT_URL = "https://chatgpt.com";
const CHILD_HTML = "loading.html";

const errorCode = {
  "-106": "网络断开: 设备未连接到互联网",
  "-118": "链接超时: 请检查您的网络连接或VPN是否开启",
  "-100": "连接关闭: 连接在完成之前被关闭, 请检查您的网络连接或VPN是否开启",
  "-3": "加载中止: 请求被中止",
};

let mainWindow;
let childView;
let loaded = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "ChatGPT",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    }
  });

  createChildView();

  mainWindow.webContents.loadURL(CHATGPT_URL);
  mainWindow.setMenu(null);

  addShortcut();

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      handleError(errorCode, errorDescription);
    }
  );

  mainWindow.webContents.on("did-finish-load", () => {
    hideLoadingView();
  });

  mainWindow.on("resize", updateViewBounds);
  mainWindow.on("move", updateViewBounds);
}

function createChildView() {
  childView = new BrowserView();
  childView.webContents.loadFile(CHILD_HTML);

  showLoadingView();
}

function updateViewBounds() {
  if (loaded) return;

  const { width, height } = mainWindow.getContentBounds();
  childView.setBounds({ x: 0, y: 0, width, height });
}

function showLoadingView() {
  loaded = false;

  mainWindow.addBrowserView(childView);
  childView.setBounds({
    x: 0,
    y: 0,
    width: mainWindow.getBounds().width,
    height: mainWindow.getBounds().height,
  });
}

function hideLoadingView() {
  loaded = true;
  mainWindow.removeBrowserView(childView);
}

function addShortcut() {
  globalShortcut.register("Ctrl+B", () => {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    } else {
      mainWindow.minimize();
    }
  });
}

function handleError(code, message) {
  let isRefresh = true;
	if (code === -3) {
		isRefresh = false;
	}
  dialog
    .showMessageBox(mainWindow, {
      type: "error",
      title: "加载失败",
      buttons: isRefresh ? ["重新加载"] : ["确定"],
      message: errorCode[code + ""] || message,
    })
    .then((res) => {
      if (isRefresh && res.response === 0) {
        mainWindow.reload();
        showLoadingView();
        isRefresh = false;
      }
    });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
