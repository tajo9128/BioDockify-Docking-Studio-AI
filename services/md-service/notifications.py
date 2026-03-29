"""
Notification channels - Multi-channel alerts
Adapted from MD-Suite biodockify_ai/channels/
Supports: Telegram, Discord, Slack, Email, WhatsApp, Feishu
"""

import os
import logging
import smtplib
import asyncio
import json
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Optional

logger = logging.getLogger("md-notifications")

COLOR_MAP = {
    "started": 3447003,
    "progress": 16776960,
    "completed": 3066993,
    "error": 15158332,
    "critical": 10038562,
}
EMOJI_MAP = {
    "started": ":play_button:",
    "progress": ":hourglass:",
    "completed": ":white_check_mark:",
    "error": ":x:",
    "critical": ":rotating_light:",
}


class NotificationManager:
    """
    Manages multi-channel notifications for MD simulation events.
    Events: started, progress, completed, error, critical_system
    """

    def __init__(self):
        self.channels: Dict[str, Any] = {}
        self._load_config()

    def _load_config(self):
        self.telegram_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
        self.discord_webhook = os.getenv("DISCORD_WEBHOOK_URL", "")
        self.slack_webhook = os.getenv("SLACK_WEBHOOK_URL", "")
        self.email_from = os.getenv("EMAIL_FROM", "")
        self.email_to = os.getenv("EMAIL_TO", "")
        self.email_smtp = os.getenv("EMAIL_SMTP_HOST", "smtp.gmail.com")
        self.email_smtp_port = int(os.getenv("EMAIL_SMTP_PORT", "587"))
        self.whatsapp_bridge_url = os.getenv("WHATSAPP_BRIDGE_URL", "")
        self.whatsapp_bridge_token = os.getenv("WHATSAPP_BRIDGE_TOKEN", "")
        self.whatsapp_default_target = os.getenv("WHATSAPP_DEFAULT_TARGET", "")
        self.feishu_app_id = os.getenv("FEISHU_APP_ID", "")
        self.feishu_app_secret = os.getenv("FEISHU_APP_SECRET", "")
        self.feishu_default_open_id = os.getenv("FEISHU_DEFAULT_OPEN_ID", "")

    def send(
        self, event: str, title: str, message: str, details: Optional[Dict] = None
    ) -> Dict[str, Any]:
        results = {}
        context = {
            "event": event,
            "title": title,
            "message": message,
            "details": details or {},
        }

        if self.telegram_token and self.telegram_chat_id:
            results["telegram"] = self._send_telegram(title, message)

        if self.discord_webhook:
            results["discord"] = self._send_discord(title, message, event)

        if self.slack_webhook:
            results["slack"] = self._send_slack(title, message, event)

        if self.email_from and self.email_to:
            results["email"] = self._send_email(title, message, event)

        if self.whatsapp_bridge_url:
            results["whatsapp"] = self._send_whatsapp(title, message)

        if self.feishu_app_id and self.feishu_app_secret:
            results["feishu"] = self._send_feishu(title, message)

        return {"sent_to": list(results.keys()), "results": results}

    def _send_telegram(self, title: str, message: str) -> Dict[str, Any]:
        try:
            import httpx

            text = f"*{title}*\n{message}"
            response = httpx.post(
                f"https://api.telegram.org/bot{self.telegram_token}/sendMessage",
                json={
                    "chat_id": self.telegram_chat_id,
                    "text": text,
                    "parse_mode": "Markdown",
                },
                timeout=10.0,
            )
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            logger.warning(f"Telegram send failed: {e}")
            return {"success": False, "error": str(e)}

    def _send_discord(self, title: str, message: str, event: str) -> Dict[str, Any]:
        try:
            import httpx

            color = COLOR_MAP.get(event, 3447003)
            payload = {
                "embeds": [{"title": title, "description": message, "color": color}]
            }
            response = httpx.post(self.discord_webhook, json=payload, timeout=10.0)
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            logger.warning(f"Discord send failed: {e}")
            return {"success": False, "error": str(e)}

    def _send_slack(self, title: str, message: str, event: str) -> Dict[str, Any]:
        try:
            import httpx

            emoji = EMOJI_MAP.get(event, ":bell:")
            payload = {"text": f"{emoji} *{title}*", "attachments": [{"text": message}]}
            response = httpx.post(self.slack_webhook, json=payload, timeout=10.0)
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            logger.warning(f"Slack send failed: {e}")
            return {"success": False, "error": str(e)}

    def _send_email(self, title: str, message: str, event: str) -> Dict[str, Any]:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[Docking Studio MD] {title}"
            msg["From"] = self.email_from
            msg["To"] = self.email_to
            html = f"<html><body><h2>{title}</h2><p>{message}</p><hr/><p><small>Sent by Docking Studio MD-Suite</small></p></body></html>"
            msg.attach(MIMEText(html, "html"))
            with smtplib.SMTP(self.email_smtp, self.email_smtp_port) as server:
                server.starttls()
                server.send_message(msg)
            return {"success": True}
        except Exception as e:
            logger.warning(f"Email send failed: {e}")
            return {"success": False, "error": str(e)}

    def _send_whatsapp(self, title: str, message: str) -> Dict[str, Any]:
        try:
            import httpx

            payload = {
                "type": "send",
                "to": self.whatsapp_default_target,
                "text": f"*{title}*\n{message}",
            }
            headers = {}
            if self.whatsapp_bridge_token:
                headers["Authorization"] = f"Bearer {self.whatsapp_bridge_token}"
            response = httpx.post(
                self.whatsapp_bridge_url,
                json=payload,
                headers=headers,
                timeout=10.0,
            )
            response.raise_for_status()
            return {"success": True}
        except Exception as e:
            logger.warning(f"WhatsApp send failed: {e}")
            return {"success": False, "error": str(e)}

    def _get_dingtalk_token(self) -> Optional[str]:
        try:
            import httpx

            url = "https://api.dingtalk.com/v1.0/oauth2/accessToken"
            resp = httpx.post(
                url,
                json={
                    "appKey": self.dingtalk_client_id,
                    "appSecret": self.dingtalk_client_secret,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json().get("accessToken")
        except Exception as e:
            logger.warning(f"DingTalk token fetch failed: {e}")
            return None

    def _send_dingtalk(self, title: str, message: str) -> Dict[str, Any]:
        try:
            import httpx

            token = self._get_dingtalk_token()
            if not token:
                return {"success": False, "error": "No access token"}
            url = "https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend"
            headers = {"x-acs-dingtalk-access-token": token}
            data = {
                "robotCode": self.dingtalk_client_id,
                "userIds": [self.dingtalk_default_user]
                if self.dingtalk_default_user
                else [],
                "msgKey": "sampleMarkdown",
                "msgParam": json.dumps(
                    {"text": f"*{title}*\n{message}", "title": title},
                    ensure_ascii=False,
                ),
            }
            resp = httpx.post(url, json=data, headers=headers, timeout=10.0)
            if resp.status_code != 200:
                logger.warning(f"DingTalk send failed: {resp.text}")
                return {"success": False, "error": resp.text}
            return {"success": True}
        except Exception as e:
            logger.warning(f"DingTalk send failed: {e}")
            return {"success": False, "error": str(e)}

    def _get_feishu_token(self) -> Optional[str]:
        try:
            import httpx

            url = (
                "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
            )
            resp = httpx.post(
                url,
                json={
                    "app_id": self.feishu_app_id,
                    "app_secret": self.feishu_app_secret,
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            return resp.json().get("tenant_access_token")
        except Exception as e:
            logger.warning(f"Feishu token fetch failed: {e}")
            return None

    def _send_feishu(self, title: str, message: str) -> Dict[str, Any]:
        try:
            import httpx

            token = self._get_feishu_token()
            if not token:
                return {"success": False, "error": "No access token"}
            url = "https://open.feishu.cn/open-apis/im/v1/messages"
            params = {"receive_id_type": "open_id"}
            headers = {"Authorization": f"Bearer {token}"}
            content = json.dumps(
                {
                    "zh_cn": {
                        "title": title,
                        "content": [[{"tag": "text", "text": message}]],
                    }
                },
                ensure_ascii=False,
            )
            data = {
                "receive_id": self.feishu_default_open_id,
                "msg_type": "post",
                "content": content,
            }
            resp = httpx.post(
                url, params=params, json=data, headers=headers, timeout=10.0
            )
            if resp.status_code != 200:
                logger.warning(f"Feishu send failed: {resp.text}")
                return {"success": False, "error": resp.text}
            return {"success": True}
        except Exception as e:
            logger.warning(f"Feishu send failed: {e}")
            return {"success": False, "error": str(e)}

    def _send_qq(self, title: str, message: str) -> Dict[str, Any]:
        try:
            import httpx

            url = "https://api.sgroup.qq.com/openwx/robot/send"
            headers = {"Content-Type": "application/json"}
            content = f"*{title}*\n{message}"
            payload = {
                "ws_token": self.qq_secret,
                "direct_message_to_master": {"content": content, "msg_type": 0},
            }
            resp = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if resp.status_code != 200:
                logger.warning(f"QQ send failed: {resp.text}")
                return {"success": False, "error": resp.text}
            return {"success": True}
        except Exception as e:
            logger.warning(f"QQ send failed: {e}")
            return {"success": False, "error": str(e)}

    def notify_simulation_started(self, job_id: str, sim_time_ns: float) -> Dict:
        return self.send(
            "started",
            "MD Simulation Started",
            f"Job `{job_id}` is running.\nSimulation time: {sim_time_ns} ns",
        )

    def notify_simulation_progress(
        self, job_id: str, progress: int, message: str
    ) -> Dict:
        return self.send(
            "progress",
            f"MD Progress: {progress}%",
            f"Job `{job_id}`: {message}",
        )

    def notify_simulation_completed(self, job_id: str, results: Dict) -> Dict:
        return self.send(
            "completed",
            "MD Simulation Completed",
            f"Job `{job_id}` finished successfully.\nResults: {results}",
        )

    def notify_simulation_error(self, job_id: str, error: str) -> Dict:
        return self.send(
            "error",
            "MD Simulation Error",
            f"Job `{job_id}` encountered an error:\n{error}",
        )

    def notify_critical(self, title: str, message: str) -> Dict:
        return self.send("critical", f"CRITICAL: {title}", message)
