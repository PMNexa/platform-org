import { defineMessages } from "platform-core";

/** An org member's role, a team member's role (`lead`/`member`) and membership status, as shown (the API's values stay as they are). */
export default defineMessages({
  en: {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    lead: "Lead",
    invited: "Invited",
    active: "Active",
    suspended: "Suspended",
  },
  vi: {
    owner: "Chủ sở hữu",
    admin: "Quản trị viên",
    member: "Thành viên",
    lead: "Trưởng nhóm",
    invited: "Đã mời",
    active: "Đang hoạt động",
    suspended: "Bị tạm ngưng",
  },
});
