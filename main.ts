import { Plugin, App, Notice, TFile, TAbstractFile, normalizePath } from "obsidian";

export default class ThumbifyPlugin extends Plugin {
  originalImageUrl: string | null = null; // 用于存储原图的 URL

  async onload() {
    console.log("Thumbify Plugin loaded!");

    // 监听图片点击事件（鼠标按下）
    this.registerDomEvent(document, "mousedown", (event) => {
      this.handleImageMouseDown(event);
    });

    // 监听鼠标释放事件（整个文档范围内）
    this.registerDomEvent(document, "mouseup", (event) => {
      this.handleImageMouseUp(event);
    });

    // 监听文件删除事件
    this.registerEvent(this.app.vault.on("delete", (file) => {
      this.handleFileDelete(file);
    }));
  }

  // 处理文件删除事件
  handleFileDelete(file: TAbstractFile) {
    // 清理与删除文件相关的缓存或状态
    if (file instanceof TFile) {
      console.log(`文件已删除：${file.path}`);
      this.originalImageUrl = null; // 重置原图 URL
    }
  }

  // 处理图片鼠标按下事件：切换为原图
  handleImageMouseDown(event: MouseEvent) {
    const target = event.target as HTMLImageElement;

    // 检查是否为图片元素
    if (target instanceof HTMLImageElement) {
      const rawThumbnailUrl = target.src; // 获取当前图片的 URL

      // 调试：输出当前缩略图 URL
      console.log("Thumbnail URL (Raw):", rawThumbnailUrl);

      // 检查是否为缩略图（路径中包含 /thumbnail/）
      if (this.isThumbnailPath(rawThumbnailUrl)) {
        // 生成原图路径
        const rawOriginalUrl = this.getOriginalPath(rawThumbnailUrl);

        // 调试：输出原图 URL
        console.log("Original URL (Raw):", rawOriginalUrl);

        // 获取文件的绝对路径
        const absoluteFilePath = this.urlToFilePath(rawOriginalUrl);

        // 调试：输出文件绝对路径
        console.log("Original File Path (Absolute):", absoluteFilePath);

        try {
          // 将绝对路径转换为 Vault 内的相对路径
          const relativeFilePath = this.absolutePathToVaultRelativePath(absoluteFilePath);

          // 调试：输出 Vault 内相对路径
          console.log("Original File Path (Vault Relative):", relativeFilePath);

          // 获取文件的 TFile 对象
          const file = this.app.vault.getAbstractFileByPath(relativeFilePath);

          if (file && file instanceof TFile) {
            // 转换原图路径为 Obsidian 内部 URL
            const encodedOriginalPath = this.app.vault.getResourcePath(file);

            // 切换图片的 src 到原图路径
            target.src = encodedOriginalPath;

            // 存储原图 URL，用于 mouseup 时恢复缩略图
            this.originalImageUrl = rawThumbnailUrl;
          } else {
            throw new Error(`文件不存在：${relativeFilePath}`);
          }
        } catch (error) {
          console.error("无法加载图片路径：", error);
        }
      } else {
        console.log("当前图片不是缩略图，无需切换。");
      }
    }
  }

  // 处理图片鼠标释放事件：切换回缩略图
  handleImageMouseUp(event: MouseEvent) {
    const target = event.target as HTMLImageElement;

    // 检查是否为图片元素
    if (target instanceof HTMLImageElement && this.originalImageUrl) {
      // 切换回缩略图路径
      target.src = this.originalImageUrl;

      // 重置原图 URL
      this.originalImageUrl = null;
    }
  }

  // 判断路径是否为缩略图路径
  isThumbnailPath(path: string): boolean {
    return path.includes("/thumbnail/");
  }

  // 生成原图路径
  getOriginalPath(thumbnailPath: string): string {
    // 去掉 /thumbnail/ 部分
    return thumbnailPath.replace("/thumbnail/", "/");
  }

  // 将 URL 转换为文件路径
  urlToFilePath(url: string): string {
    // 去掉 URL 前缀（例如 `app://` 或 `http://`）
    const prefixRegex = /^app:\/\/.*?\//;
    const pathWithoutPrefix = url.replace(prefixRegex, "");

    // 去掉查询参数（例如 `?1740218121706`）
    const pathWithoutQuery = pathWithoutPrefix.split("?")[0];

    // 解码路径中的编码字符（例如 `%E5%B0%8F%E8%AF%B4`）
    const decodedPath = decodeURIComponent(pathWithoutQuery);

    // 去掉 Windows 路径中的 `file:///`（如果存在）
    if (decodedPath.startsWith("file:///")) {
      return decodedPath.slice("file:///".length);
    }

    return decodedPath;
  }

  // 将绝对路径转换为 Vault 内的相对路径
  absolutePathToVaultRelativePath(absolutePath: string): string {
    // 获取 Vault 的根路径
    const vaultRootPath = this.app.vault.adapter.getBasePath();

    // 规范化 Vault 根路径
    const normalizedVaultRootPath = normalizePath(vaultRootPath);

    // 规范化绝对路径
    const normalizedAbsolutePath = normalizePath(absolutePath);

    // 检查绝对路径是否以 Vault 根路径开头
    if (normalizedAbsolutePath.startsWith(normalizedVaultRootPath)) {
      // 提取 Vault 内的相对路径
      const relativePath = normalizedAbsolutePath.slice(normalizedVaultRootPath.length + 1);
      return relativePath;
    } else {
      throw new Error(`路径不在 Vault 内：${absolutePath}`);
    }
  }
}
