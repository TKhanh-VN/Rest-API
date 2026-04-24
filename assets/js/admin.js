const state = {
  token: localStorage.getItem("admin_token") || ""
};

const tokenInput = document.getElementById("adminTokenInput");
const toast = document.getElementById("toast");

tokenInput.value = state.token;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

async function adminFetch(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${state.token}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: "Invalid JSON response",
    data: null
  }));

  if (!data.success) {
    throw new Error(data.message || "Request failed");
  }

  return data.data;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size = size / 1024;
    index++;
  }

  return `${size.toFixed(2)} ${units[index]}`;
}

function formatUptime(seconds) {
  const total = Math.floor(seconds || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  return `${hours}h ${minutes}m ${secs}s`;
}

function setTableEmpty(tbody, colspan, message) {
  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}">${message}</td>
    </tr>
  `;
}

async function loadDashboard() {
  const status = await adminFetch("/admin/status");
  const plugins = await adminFetch("/admin/plugins");
  const endpoints = await adminFetch("/admin/endpoints");
  const traffic = await adminFetch("/admin/traffic");

  document.getElementById("uptimeValue").textContent = formatUptime(status.uptime);
  document.getElementById("memoryValue").textContent = formatBytes(status.memory.heapUsed);
  document.getElementById("pluginCountValue").textContent = plugins.length;
  document.getElementById("endpointCountValue").textContent = endpoints.length;

  document.getElementById("trafficContent").textContent = JSON.stringify(traffic, null, 2);
}

async function loadPlugins() {
  const plugins = await adminFetch("/admin/plugins");
  const tbody = document.getElementById("pluginsTableBody");

  if (!plugins.length) {
    setTableEmpty(tbody, 6, "Chưa có plugin nào.");
    return;
  }

  tbody.innerHTML = plugins.map((plugin) => {
    const status = plugin.enabled && plugin.loaded
      ? `<span class="badge badge-success">Enabled</span>`
      : `<span class="badge badge-danger">Disabled</span>`;

    const actionText = plugin.enabled ? "Tắt" : "Bật";
    const nextEnabled = plugin.enabled ? "false" : "true";

    return `
      <tr>
        <td>${plugin.key}</td>
        <td>${plugin.endpoint}</td>
        <td><span class="badge badge-info">${String(plugin.method).toUpperCase()}</span></td>
        <td>${status}</td>
        <td>${plugin.description || "-"}</td>
        <td>
          <button class="button button-secondary button-small" onclick="togglePlugin('${plugin.key}', ${nextEnabled})">
            ${actionText}
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadEndpoints() {
  const endpoints = await adminFetch("/admin/endpoints");
  const tbody = document.getElementById("endpointsTableBody");

  if (!endpoints.length) {
    setTableEmpty(tbody, 4, "Chưa có endpoint nào.");
    return;
  }

  tbody.innerHTML = endpoints.map((endpoint) => {
    return `
      <tr>
        <td>${endpoint.endpoint}</td>
        <td><span class="badge badge-info">${endpoint.method}</span></td>
        <td>${endpoint.key}</td>
        <td><span class="badge badge-success">Active</span></td>
      </tr>
    `;
  }).join("");
}

async function loadLogs() {
  const logs = await adminFetch("/admin/logs?limit=200");
  const logsBox = document.getElementById("logsBox");

  if (!logs.length) {
    logsBox.textContent = "Chưa có logs.";
    return;
  }

  logsBox.textContent = logs.map((log) => {
    return `[${log.time}] [${log.level}] ${log.message}`;
  }).join("\n");
}

async function loadSecurity() {
  const security = await adminFetch("/admin/security");
  const blacklist = await adminFetch("/admin/blacklist");

  document.getElementById("securityConfigBox").textContent = JSON.stringify(security, null, 2);

  const box = document.getElementById("blacklistBox");

  if (!blacklist.length) {
    box.innerHTML = `<span class="badge badge-info">Blacklist trống</span>`;
    return;
  }

  box.innerHTML = blacklist.map((ip) => {
    return `
      <span class="badge badge-danger">
        ${ip}
        <button class="mini-remove" onclick="removeBlacklist('${ip}')">×</button>
      </span>
    `;
  }).join("");
}

async function togglePlugin(key, enabled) {
  await adminFetch("/admin/plugins/toggle", {
    method: "POST",
    body: JSON.stringify({
      key,
      enabled
    })
  });

  showToast("Đã cập nhật plugin");
  await loadPlugins();
  await loadEndpoints();
}

async function removeBlacklist(ip) {
  await adminFetch("/admin/blacklist", {
    method: "DELETE",
    body: JSON.stringify({ ip })
  });

  showToast("Đã xóa IP khỏi blacklist");
  await loadSecurity();
}

document.getElementById("saveTokenButton").addEventListener("click", () => {
  state.token = tokenInput.value.trim();
  localStorage.setItem("admin_token", state.token);
  showToast("Đã lưu admin token");
});

document.querySelectorAll(".navigation-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".navigation-button").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".section").forEach((item) => item.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(button.dataset.section).classList.add("active");
  });
});

document.getElementById("refreshDashboardButton").addEventListener("click", async () => {
  try {
    await loadDashboard();
    showToast("Đã làm mới dashboard");
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("reloadPluginsButton").addEventListener("click", async () => {
  try {
    await adminFetch("/admin/plugins/reload", {
      method: "POST"
    });

    await loadPlugins();
    await loadEndpoints();

    showToast("Đã reload plugins");
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("refreshEndpointsButton").addEventListener("click", async () => {
  try {
    await loadEndpoints();
    showToast("Đã làm mới endpoints");
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("clearLogsButton").addEventListener("click", async () => {
  try {
    await adminFetch("/admin/logs", {
      method: "DELETE"
    });

    await loadLogs();
    showToast("Đã xóa logs");
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("refreshSecurityButton").addEventListener("click", async () => {
  try {
    await loadSecurity();
    showToast("Đã làm mới security");
  } catch (error) {
    showToast(error.message);
  }
});

document.getElementById("addBlacklistButton").addEventListener("click", async () => {
  try {
    const input = document.getElementById("blacklistIpInput");
    const ip = input.value.trim();

    if (!ip) {
      showToast("Vui lòng nhập IP");
      return;
    }

    await adminFetch("/admin/blacklist", {
      method: "POST",
      body: JSON.stringify({ ip })
    });

    input.value = "";
    await loadSecurity();
    showToast("Đã thêm IP vào blacklist");
  } catch (error) {
    showToast(error.message);
  }
});

async function boot() {
  try {
    await loadDashboard();
    await loadPlugins();
    await loadEndpoints();
    await loadLogs();
    await loadSecurity();
  } catch (error) {
    showToast(error.message);
  }
}

boot();
