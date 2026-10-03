/** 获取本机设备 ID（跨刷新持久），用于「我的发布」归属与管理鉴权 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem("shuji-device-id");
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("shuji-device-id", id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}
