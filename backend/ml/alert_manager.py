"""Alert Manager for ML Monitoring.

This module provides alerting functionality for ML model monitoring,
supporting email and Slack notifications for performance degradation
and drift detection.
"""

import logging
import os
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertType(Enum):
    """Alert types."""

    PERFORMANCE_DEGRADATION = "performance_degradation"
    FEATURE_DRIFT = "feature_drift"
    MODEL_ERROR = "model_error"
    SYSTEM_HEALTH = "system_health"


class AlertManager:
    """Manage alerts for ML monitoring.

    Sends notifications via email and Slack for model performance issues,
    drift detection, and system health problems.
    """

    def __init__(
        self,
        email_enabled: bool = False,
        slack_enabled: bool = False,
        email_config: Optional[Dict[str, Any]] = None,
        slack_config: Optional[Dict[str, Any]] = None,
    ):
        """Initialize alert manager.

        Args:
            email_enabled: Enable email notifications
            slack_enabled: Enable Slack notifications
            email_config: Email configuration (SMTP settings, recipients)
            slack_config: Slack configuration (webhook URL, channel)
        """
        self.email_enabled = email_enabled
        self.slack_enabled = slack_enabled
        self.email_config = email_config or {}
        self.slack_config = slack_config or {}

        # Load from environment if not provided
        if not self.email_config:
            self.email_config = self._load_email_config()

        if not self.slack_config:
            self.slack_config = self._load_slack_config()

        logger.info(
            f"AlertManager initialized (email: {email_enabled}, slack: {slack_enabled})"
        )

    def _load_email_config(self) -> Dict[str, Any]:
        """Load email configuration from environment variables.

        Returns:
            Email configuration dictionary
        """
        return {
            "smtp_host": os.getenv("ALERT_SMTP_HOST", "smtp.gmail.com"),
            "smtp_port": int(os.getenv("ALERT_SMTP_PORT", "587")),
            "smtp_user": os.getenv("ALERT_SMTP_USER", ""),
            "smtp_password": os.getenv("ALERT_SMTP_PASSWORD", ""),
            "from_email": os.getenv("ALERT_FROM_EMAIL", ""),
            "to_emails": os.getenv("ALERT_TO_EMAILS", "").split(","),
            "use_tls": os.getenv("ALERT_SMTP_TLS", "true").lower() == "true",
        }

    def _load_slack_config(self) -> Dict[str, Any]:
        """Load Slack configuration from environment variables.

        Returns:
            Slack configuration dictionary
        """
        return {
            "webhook_url": os.getenv("ALERT_SLACK_WEBHOOK_URL", ""),
            "channel": os.getenv("ALERT_SLACK_CHANNEL", "#ml-alerts"),
            "username": os.getenv("ALERT_SLACK_USERNAME", "ML Monitor Bot"),
            "icon_emoji": os.getenv("ALERT_SLACK_ICON", ":robot_face:"),
        }

    async def send_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        model_name: Optional[str] = None,
    ) -> bool:
        """Send alert notification.

        Args:
            alert_type: Type of alert
            severity: Alert severity level
            title: Alert title
            message: Alert message
            details: Additional details dictionary
            model_name: Model name (optional)

        Returns:
            True if alert sent successfully, False otherwise
        """
        try:
            # Create alert payload
            alert_data = {
                "type": alert_type.value,
                "severity": severity.value,
                "title": title,
                "message": message,
                "details": details or {},
                "model_name": model_name,
                "timestamp": datetime.now().isoformat(),
            }

            # Log alert
            logger.warning(
                f"ALERT [{severity.value.upper()}] {alert_type.value}: {title} - {message}"
            )

            # Send via enabled channels
            success = True

            if self.email_enabled:
                email_success = await self._send_email_alert(alert_data)
                success = success and email_success

            if self.slack_enabled:
                slack_success = await self._send_slack_alert(alert_data)
                success = success and slack_success

            if not self.email_enabled and not self.slack_enabled:
                logger.warning("No alert channels enabled - alert logged only")

            return success

        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
            return False

    async def _send_email_alert(self, alert_data: Dict[str, Any]) -> bool:
        """Send email alert.

        Args:
            alert_data: Alert data dictionary

        Returns:
            True if sent successfully
        """
        try:
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText

            # Validate configuration
            if not self.email_config.get("smtp_user") or not self.email_config.get(
                "to_emails"
            ):
                logger.warning("Email configuration incomplete - skipping email alert")
                return False

            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"[{alert_data['severity'].upper()}] {alert_data['title']}"
            msg["From"] = (
                self.email_config["from_email"] or self.email_config["smtp_user"]
            )
            msg["To"] = ", ".join(self.email_config["to_emails"])

            # Create email body
            text_body = self._format_email_text(alert_data)
            html_body = self._format_email_html(alert_data)

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            # Send email
            with smtplib.SMTP(
                self.email_config["smtp_host"], self.email_config["smtp_port"]
            ) as server:
                if self.email_config["use_tls"]:
                    server.starttls()

                if self.email_config["smtp_password"]:
                    server.login(
                        self.email_config["smtp_user"],
                        self.email_config["smtp_password"],
                    )

                server.send_message(msg)

            logger.info(
                f"Email alert sent to {len(self.email_config['to_emails'])} recipients"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
            return False

    def _format_email_text(self, alert_data: Dict[str, Any]) -> str:
        """Format alert as plain text email.

        Args:
            alert_data: Alert data dictionary

        Returns:
            Plain text email body
        """
        lines = [
            f"Alert Type: {alert_data['type']}",
            f"Severity: {alert_data['severity'].upper()}",
            f"Time: {alert_data['timestamp']}",
            "",
            f"Title: {alert_data['title']}",
            "",
            f"Message: {alert_data['message']}",
            "",
        ]

        if alert_data.get("model_name"):
            lines.append(f"Model: {alert_data['model_name']}")
            lines.append("")

        if alert_data.get("details"):
            lines.append("Details:")
            for key, value in alert_data["details"].items():
                lines.append(f"  {key}: {value}")

        return "\n".join(lines)

    def _format_email_html(self, alert_data: Dict[str, Any]) -> str:
        """Format alert as HTML email.

        Args:
            alert_data: Alert data dictionary

        Returns:
            HTML email body
        """
        severity_colors = {
            "low": "#28a745",
            "medium": "#ffc107",
            "high": "#fd7e14",
            "critical": "#dc3545",
        }

        color = severity_colors.get(alert_data["severity"], "#6c757d")

        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .alert-box {{ 
                    border-left: 4px solid {color}; 
                    padding: 15px; 
                    background-color: #f8f9fa;
                    margin: 20px 0;
                }}
                .severity {{ 
                    color: {color}; 
                    font-weight: bold; 
                    font-size: 18px;
                }}
                .details {{ 
                    background-color: #ffffff; 
                    padding: 10px; 
                    margin-top: 10px;
                    border-radius: 4px;
                }}
                .detail-item {{ margin: 5px 0; }}
            </style>
        </head>
        <body>
            <div class="alert-box">
                <div class="severity">{alert_data['severity'].upper()} ALERT</div>
                <h2>{alert_data['title']}</h2>
                <p><strong>Type:</strong> {alert_data['type']}</p>
                <p><strong>Time:</strong> {alert_data['timestamp']}</p>
        """

        if alert_data.get("model_name"):
            html += f"<p><strong>Model:</strong> {alert_data['model_name']}</p>"

        html += f"""
                <p><strong>Message:</strong></p>
                <p>{alert_data['message']}</p>
        """

        if alert_data.get("details"):
            html += '<div class="details"><strong>Details:</strong>'
            for key, value in alert_data["details"].items():
                html += (
                    f'<div class="detail-item"><strong>{key}:</strong> {value}</div>'
                )
            html += "</div>"

        html += """
            </div>
        </body>
        </html>
        """

        return html

    async def _send_slack_alert(self, alert_data: Dict[str, Any]) -> bool:
        """Send Slack alert.

        Args:
            alert_data: Alert data dictionary

        Returns:
            True if sent successfully
        """
        try:
            import aiohttp

            # Validate configuration
            if not self.slack_config.get("webhook_url"):
                logger.warning(
                    "Slack webhook URL not configured - skipping Slack alert"
                )
                return False

            # Create Slack message
            slack_message = self._format_slack_message(alert_data)

            # Send to Slack
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.slack_config["webhook_url"],
                    json=slack_message,
                    headers={"Content-Type": "application/json"},
                ) as response:
                    if response.status == 200:
                        logger.info("Slack alert sent successfully")
                        return True
                    else:
                        logger.error(f"Slack alert failed: {response.status}")
                        return False

        except Exception as e:
            logger.error(f"Failed to send Slack alert: {e}")
            return False

    def _format_slack_message(self, alert_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format alert as Slack message.

        Args:
            alert_data: Alert data dictionary

        Returns:
            Slack message payload
        """
        # Severity emoji
        severity_emoji = {
            "low": ":information_source:",
            "medium": ":warning:",
            "high": ":exclamation:",
            "critical": ":rotating_light:",
        }

        emoji = severity_emoji.get(alert_data["severity"], ":bell:")

        # Severity color
        severity_colors = {
            "low": "good",
            "medium": "warning",
            "high": "danger",
            "critical": "danger",
        }

        color = severity_colors.get(alert_data["severity"], "#808080")

        # Build fields
        fields = [
            {"title": "Type", "value": alert_data["type"], "short": True},
            {
                "title": "Severity",
                "value": alert_data["severity"].upper(),
                "short": True,
            },
        ]

        if alert_data.get("model_name"):
            fields.append(
                {"title": "Model", "value": alert_data["model_name"], "short": True}
            )

        # Add details
        if alert_data.get("details"):
            for key, value in alert_data["details"].items():
                fields.append(
                    {
                        "title": key.replace("_", " ").title(),
                        "value": str(value),
                        "short": True,
                    }
                )

        # Create message
        message = {
            "channel": self.slack_config["channel"],
            "username": self.slack_config["username"],
            "icon_emoji": self.slack_config["icon_emoji"],
            "text": f"{emoji} *{alert_data['title']}*",
            "attachments": [
                {
                    "color": color,
                    "text": alert_data["message"],
                    "fields": fields,
                    "footer": "ML Monitoring System",
                    "ts": int(datetime.now().timestamp()),
                }
            ],
        }

        return message

    async def send_performance_degradation_alert(
        self,
        model_name: str,
        model_version: str,
        current_r2: float,
        threshold: float,
        metrics: Dict[str, float],
    ) -> bool:
        """Send alert for performance degradation.

        Args:
            model_name: Model name
            model_version: Model version
            current_r2: Current R² score
            threshold: Threshold that was breached
            metrics: Current metrics

        Returns:
            True if alert sent successfully
        """
        # Determine severity
        if current_r2 < 0.75:
            severity = AlertSeverity.CRITICAL
        elif current_r2 < 0.80:
            severity = AlertSeverity.HIGH
        else:
            severity = AlertSeverity.MEDIUM

        title = f"Performance Degradation Detected: {model_name}"
        message = (
            f"Model {model_name} (v{model_version}) performance has degraded. "
            f"Current R² score ({current_r2:.3f}) is below threshold ({threshold:.3f})."
        )

        details = {
            "r2_score": f"{current_r2:.3f}",
            "threshold": f"{threshold:.3f}",
            "rmse": f"{metrics.get('rmse', 0):.2f}",
            "mae": f"{metrics.get('mae', 0):.2f}",
            "mape": f"{metrics.get('mape', 0):.2f}%",
        }

        return await self.send_alert(
            alert_type=AlertType.PERFORMANCE_DEGRADATION,
            severity=severity,
            title=title,
            message=message,
            details=details,
            model_name=model_name,
        )

    async def send_drift_detection_alert(
        self,
        model_name: str,
        features_with_drift: List[str],
        total_features: int,
        drift_details: List[Dict[str, Any]],
    ) -> bool:
        """Send alert for feature drift detection.

        Args:
            model_name: Model name
            features_with_drift: List of features with detected drift
            total_features: Total number of features checked
            drift_details: Detailed drift information

        Returns:
            True if alert sent successfully
        """
        drift_count = len(features_with_drift)
        drift_pct = (drift_count / total_features * 100) if total_features > 0 else 0

        # Determine severity based on percentage of features with drift
        if drift_pct >= 50:
            severity = AlertSeverity.CRITICAL
        elif drift_pct >= 30:
            severity = AlertSeverity.HIGH
        elif drift_pct >= 10:
            severity = AlertSeverity.MEDIUM
        else:
            severity = AlertSeverity.LOW

        title = f"Feature Drift Detected: {model_name}"
        message = (
            f"Drift detected in {drift_count} out of {total_features} features "
            f"({drift_pct:.1f}%) for model {model_name}."
        )

        details = {
            "features_with_drift": ", ".join(features_with_drift[:5]),
            "drift_percentage": f"{drift_pct:.1f}%",
            "total_features_checked": total_features,
        }

        # Add top drifted features
        if drift_details:
            sorted_drift = sorted(
                drift_details,
                key=lambda x: abs(x.get("mean_change_pct", 0)),
                reverse=True,
            )

            for i, drift in enumerate(sorted_drift[:3], 1):
                details[f"top_{i}_feature"] = (
                    f"{drift['feature_name']} "
                    f"({drift.get('mean_change_pct', 0):.1f}% change)"
                )

        return await self.send_alert(
            alert_type=AlertType.FEATURE_DRIFT,
            severity=severity,
            title=title,
            message=message,
            details=details,
            model_name=model_name,
        )

    async def send_model_error_alert(
        self,
        model_name: str,
        error_type: str,
        error_message: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Send alert for model errors.

        Args:
            model_name: Model name
            error_type: Type of error
            error_message: Error message
            context: Additional context

        Returns:
            True if alert sent successfully
        """
        title = f"Model Error: {model_name}"
        message = f"Error in model {model_name}: {error_type} - {error_message}"

        return await self.send_alert(
            alert_type=AlertType.MODEL_ERROR,
            severity=AlertSeverity.HIGH,
            title=title,
            message=message,
            details=context or {},
            model_name=model_name,
        )

    async def send_system_health_alert(
        self,
        component: str,
        status: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Send alert for system health issues.

        Args:
            component: System component name
            status: Component status
            message: Alert message
            details: Additional details

        Returns:
            True if alert sent successfully
        """
        severity = AlertSeverity.HIGH if status == "error" else AlertSeverity.MEDIUM

        title = f"System Health Issue: {component}"

        return await self.send_alert(
            alert_type=AlertType.SYSTEM_HEALTH,
            severity=severity,
            title=title,
            message=message,
            details=details or {},
        )


# Global alert manager instance
_alert_manager: Optional[AlertManager] = None


def get_alert_manager() -> AlertManager:
    """Get global alert manager instance.

    Returns:
        AlertManager instance
    """
    global _alert_manager

    if _alert_manager is None:
        # Load configuration from environment
        email_enabled = os.getenv("ALERT_EMAIL_ENABLED", "false").lower() == "true"
        slack_enabled = os.getenv("ALERT_SLACK_ENABLED", "false").lower() == "true"

        _alert_manager = AlertManager(
            email_enabled=email_enabled, slack_enabled=slack_enabled
        )

    return _alert_manager
