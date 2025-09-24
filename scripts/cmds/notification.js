const { getStreamsFromAttachment } = global.utils;

module.exports = {
	config: {
		name: "notification",
		aliases: ["notify", "noti"],
		version: "1.7",
		author: "messie osango", 
		countDown: 5,
		role: 2,
		description: {
			vi: "Gửi thông báo từ admin đến all box",
			fr: "Envoyer une notification aux groupes" 
		},
		category: "owner",
		guide: {
			fr: "{pn} <message>" 
		},
		envConfig: {
			delayPerGroup: 250
		}
	},

	langs: {
		vi: {
			missingMessage: "Vui lòng nhập tin nhắn bạn muốn gửi đến tất cả các nhóm",
			notification: "Thông báo từ admin bot đến tất cả nhóm chat (không phản hồi tin nhắn này)",
			sendingNotification: "Bắt đầu gửi thông báo từ admin bot đến %1 nhóm chat",
			sentNotification: "✅ Đã gửi thông báo đến %1 nhóm thành công",
			errorSendingNotification: "Có lỗi xảy ra khi gửi đến %1 nhóm:\n%2"
		},
		fr: { 
			missingMessage: "╭───⌾⋅ 𝐸𝑅𝑅𝐸𝑈𝑅 ⋅⌾───╮\n│\n│   Veuillez entrer le message à envoyer\n│\n╰──────⌾⋅ ⌾ ⋅⌾──────╯",
			notification: "╭───⌾⋅ 𝑁𝑂𝑇𝐼𝐹𝐼𝐶𝐴𝑇𝐼𝑂𝑁 ⋅⌾───╮\n│\n│   Message de l'administrateur\n│   (ne pas répondre à ce message)\n│\n│   ────────────────────────\n│   %1\n│\n╰──────⌾⋅ ⌾ ⋅⌾──────╯",
			sendingNotification: "╭───⌾⋅ 𝑆𝑇𝐴𝑇𝑈𝑇 ⋅⌾───╮\n│\n│   Envoi en cours à %1 groupes...\n│\n╰──────⌾⋅ ⌾ ⋅⌾──────╯",
			sentNotification: "╭───⌾⋅ 𝑆𝑈𝐶𝐶𝐸𝑆 ⋅⌾───╮\n│\n│   ✅ Notification envoyée à %1 groupes\n│\n╰──────⌾⋅ ⌾ ⋅⌾──────╯",
			errorSendingNotification: "╭───⌾⋅ 𝐸𝑅𝑅𝐸𝑈𝑅𝑆 ⋅⌾───╮\n│\n│   ⚠️ Problèmes avec %1 groupes:\n│   %2\n│\n╰──────⌾⋅ ⌾ ⋅⌾──────╯"
		}
	},

	onStart: async function ({ message, api, event, args, commandName, envCommands, threadsData, getLang }) {
		const { delayPerGroup } = envCommands[commandName];
		if (!args[0])
			return message.reply(getLang("missingMessage"));
		
		const notificationMessage = getLang("notification", args.join(" "));
		const formSend = {
			body: notificationMessage,
			attachment: await getStreamsFromAttachment(
				[
					...event.attachments,
					...(event.messageReply?.attachments || [])
				].filter(item => ["photo", "png", "animated_image", "video", "audio"].includes(item.type))
			)
		};

		const allThreadID = (await threadsData.getAll()).filter(t => t.isGroup && t.members.find(m => m.userID == api.getCurrentUserID())?.inGroup);
		message.reply(getLang("sendingNotification", allThreadID.length));

		let sendSucces = 0;
		const sendError = [];
		const wattingSend = [];

		for (const thread of allThreadID) {
			const tid = thread.threadID;
			try {
				wattingSend.push({
					threadID: tid,
					pending: api.sendMessage(formSend, tid)
				});
				await new Promise(resolve => setTimeout(resolve, delayPerGroup));
			}
			catch (e) {
				sendError.push(tid);
			}
		}

		for (const sended of wattingSend) {
			try {
				await sended.pending;
				sendSucces++;
			}
			catch (e) {
				const { errorDescription } = e;
				if (!sendError.some(item => item.errorDescription == errorDescription))
					sendError.push({
						threadIDs: [sended.threadID],
						errorDescription
					});
				else
					sendError.find(item => item.errorDescription == errorDescription).threadIDs.push(sended.threadID);
			}
		}

		let msg = "";
		if (sendSucces > 0)
			msg += getLang("sentNotification", sendSucces) + "\n";
		if (sendError.length > 0)
			msg += getLang("errorSendingNotification", sendError.reduce((a, b) => a + b.threadIDs.length, 0), sendError.reduce((a, b) => a + `\n - ${b.errorDescription}\n  + ${b.threadIDs.join("\n  + ")}`, ""));
		
		message.reply(msg || "╭───⌾⋅ DARK BOT ⋅⌾───╮\n│\n│   Opération terminée\n│\n╰──────⌾⋅ ⌾ ⋅⌾──────╯");
	}
};
