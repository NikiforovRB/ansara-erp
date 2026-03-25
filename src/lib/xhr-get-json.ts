/** GET JSON с отслеживанием прогресса (если сервер отдал Content-Length). */
export function xhrGetJsonWithProgress(
  url: string,
  onProgress: (percent: number | null) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.withCredentials = true;
    xhr.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
      } else {
        onProgress(null);
      }
    };
    xhr.onload = () => {
      onProgress(100);
      if (xhr.status === 401) {
        const err = new Error("401") as Error & { status: number };
        err.status = 401;
        reject(err);
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const err = new Error(xhr.responseText || String(xhr.status)) as Error & {
          status: number;
        };
        err.status = xhr.status;
        reject(err);
        return;
      }
      resolve(xhr.responseText);
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send();
  });
}

/** POST FormData -> JSON with upload progress (uses XHR upload progress). */
export function xhrPostFormDataJsonWithProgress<T>(
  url: string,
  form: FormData,
  onProgress: (percent: number | null) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.min(100, Math.round((100 * e.loaded) / e.total)));
      } else {
        onProgress(null);
      }
    };
    xhr.onload = () => {
      onProgress(100);
      if (xhr.status === 401) {
        const err = new Error("401") as Error & { status: number };
        err.status = 401;
        reject(err);
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        const err = new Error(xhr.responseText || String(xhr.status)) as Error & {
          status: number;
        };
        err.status = xhr.status;
        reject(err);
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch {
        reject(new Error("invalid_json"));
      }
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(form);
  });
}
