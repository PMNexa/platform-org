import { defineMessages } from "platform-core";

/** Errors this module's API client makes up itself (the server's own messages come back translated). */
export default defineMessages({
  en: {
    networkFailed: "Network request failed",
    requestFailed: "Request to {url} failed with status {status}",
    invitationInvalid: "This invitation link isn't valid.",
  },
  vi: {
    networkFailed: "Không kết nối được tới máy chủ",
    requestFailed: "Yêu cầu tới {url} thất bại với mã {status}",
    invitationInvalid: "Liên kết lời mời này không hợp lệ.",
  },
});
