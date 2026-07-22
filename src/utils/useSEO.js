import { useEffect } from "react";

/**
 * Custom Hook React tự động cập nhật Title và Meta description cho trang web
 * @param {string} title - Tiêu đề trang
 * @param {string} description - Mô tả ngắn của trang
 */
export default function useSEO(title, description) {
  useEffect(() => {
    // 1. Update Title
    if (title) {
      document.title = `${title} | CodeLearn`;
    } else {
      document.title = "CodeLearn - Nền Tảng Học Lập Trình Trực Tuyến";
    }

    // 2. Update Meta Description
    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement("meta");
        metaDesc.name = "description";
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", description);
    }
  }, [title, description]);
}
