import { defineMessages } from "platform-core";

/** An org member's role and membership status, as shown (the API's values stay as they are). */
export default defineMessages({
  en: {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    invited: "Invited",
    active: "Active",
    suspended: "Suspended",
  },
  vi: {
    owner: "Chủ sở hữu",
    admin: "Quản trị viên",
    member: "Thành viên",
    invited: "Đã mời",
    active: "Đang hoạt động",
    suspended: "Bị tạm ngưng",
  },
});
