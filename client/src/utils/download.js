import toast from "react-hot-toast";
import api, { getErrorMessage } from "../services/api";

// Downloads a protected report. The request carries the login token, so a plain link would not work.
export const downloadReport = async (type, params, format) => {
  try {
    const { data } = await api.get(`/reports/${type}`, { params: { ...params, format }, responseType: "blob" });
    const url = URL.createObjectURL(data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${type}-${params.from}-to-${params.to}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
};
