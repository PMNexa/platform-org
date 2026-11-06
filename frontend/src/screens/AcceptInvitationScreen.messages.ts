import { defineMessages } from "platform-core";

export default defineMessages({
  en: {
    someone: "Someone",
    accepted: "This invitation has already been accepted.",
    declined: "This invitation was declined.",
    expired: "This invitation has expired. Ask for a new one.",
    notForMe: "This invitation was sent to {email}. Sign in with that email to accept it.",
    loading: "Loading…",
    join: "Join {org}",
    invitedYou: (v: { inviter: string; org: string; role: string }) =>
      `${v.inviter} invited you to join ${v.org} as ${v.role.toLowerCase()}. Members see and work on the organization's goals.`,
    alreadyMember: "You're already a member.",
    open: "Open {org}",
    decline: "Decline",
    accept: "Accept invitation",
  },
  vi: {
    someone: "Một người",
    accepted: "Lời mời này đã được chấp nhận.",
    declined: "Lời mời này đã bị từ chối.",
    expired: "Lời mời này đã hết hạn. Hãy xin một lời mời mới.",
    notForMe: "Lời mời này được gửi tới {email}. Hãy đăng nhập bằng email đó để chấp nhận.",
    loading: "Đang tải…",
    join: "Tham gia {org}",
    invitedYou: (v: { inviter: string; org: string; role: string }) =>
      `${v.inviter} đã mời bạn tham gia ${v.org} với vai trò ${v.role.toLowerCase()}. Thành viên được xem và cùng thực hiện các mục tiêu của tổ chức.`,
    alreadyMember: "Bạn đã là thành viên.",
    open: "Mở {org}",
    decline: "Từ chối",
    accept: "Chấp nhận lời mời",
  },
});
