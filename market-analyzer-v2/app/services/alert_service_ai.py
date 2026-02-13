import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

class StressAlertService:
    """
    AI-powered alert service for high stress levels.
    Sends notifications to designated users/employees when stress exceeds thresholds.
    """
    
    # Alert thresholds
    MODERATE_STRESS = 0.60
    HIGH_STRESS = 0.75
    CRITICAL_STRESS = 0.85
    
    # Cooldown period (seconds) between alerts for same user
    ALERT_COOLDOWN = 300  # 5 minutes
    
    def __init__(self, mongo=None):
        self.mongo = mongo
        self.last_alerts = {}  # Track last alert time per user
        self.email_enabled = bool(os.getenv('SMTP_EMAIL'))
        
    def check_stress_and_alert(self, user_id: str, stress_level: float, symbol: str = None):
        """
        Check stress level and send alert if needed.
        Uses intelligent thresholds:
        - Moderate (0.60-0.75): Log to dashboard
        - High (0.75-0.85): Send alert to manager
        - Critical (0.85+): Send urgent alert + escalate
        """
        alert = None
        
        if stress_level >= self.CRITICAL_STRESS:
            alert = self._create_critical_alert(user_id, stress_level, symbol)
            self._escalate_alert(alert)
        elif stress_level >= self.HIGH_STRESS:
            alert = self._create_high_alert(user_id, stress_level, symbol)
            self._send_manager_alert(alert)
        elif stress_level >= self.MODERATE_STRESS:
            alert = self._create_moderate_alert(user_id, stress_level, symbol)
            self._log_alert(alert)
        
        return alert
    
    def _create_critical_alert(self, user_id: str, stress_level: float, symbol: str):
        """Create critical alert (stress > 85%)"""
        return {
            'userId': user_id,
            'stressLevel': stress_level,
            'symbol': symbol,
            'severity': 'CRITICAL',
            'message': f'🚨 CRITICAL STRESS ALERT: {(stress_level*100):.1f}%',
            'description': f'Employee stress level critically high. Immediate intervention recommended.',
            'timestamp': datetime.utcnow().isoformat(),
            'requiresApproval': True,
            'escalated': True
        }
    
    def _create_high_alert(self, user_id: str, stress_level: float, symbol: str):
        """Create high alert (60-85% stress)"""
        return {
            'userId': user_id,
            'stressLevel': stress_level,
            'symbol': symbol,
            'severity': 'HIGH',
            'message': f'⚠️ HIGH STRESS ALERT: {(stress_level*100):.1f}%',
            'description': f'Employee stress level elevated. Manager notification sent.',
            'timestamp': datetime.utcnow().isoformat(),
            'requiresApproval': False,
            'escalated': False
        }
    
    def _create_moderate_alert(self, user_id: str, stress_level: float, symbol: str):
        """Create moderate alert (60%+ stress)"""
        return {
            'userId': user_id,
            'stressLevel': stress_level,
            'symbol': symbol,
            'severity': 'MODERATE',
            'message': f'ℹ️ MODERATE STRESS: {(stress_level*100):.1f}%',
            'description': f'Employee stress level elevated. Logged for review.',
            'timestamp': datetime.utcnow().isoformat(),
            'requiresApproval': False,
            'escalated': False
        }
    
    def _log_alert(self, alert: dict):
        """Log moderate alert to database"""
        try:
            if self.mongo:
                self.mongo.db.stressAlerts.insert_one(alert)
                print(f"[OK] Logged moderate alert for {alert['userId']}: {alert['message']}")
        except Exception as e:
            print(f"[ERROR] Logging alert: {e}")
    
    def _send_manager_alert(self, alert: dict):
        """Send high-level alert to manager"""
        try:
            if self.mongo:
                # Store alert
                self.mongo.db.stressAlerts.insert_one(alert)
                
                # Fetch user and manager info
                user = self.mongo.db.users.find_one({'_id': alert['userId']})
                if user and user.get('managerId'):
                    manager = self.mongo.db.users.find_one({'_id': user['managerId']})
                    if manager and manager.get('email'):
                        self._send_email(
                            manager['email'],
                            f"High Stress Alert: {user.get('name', 'Employee')}",
                            alert
                        )
                
                print(f"[OK] Sent manager alert for {alert['userId']}: {alert['message']}")
        except Exception as e:
            print(f"[ERROR] Sending manager alert: {e}")
    
    def _escalate_alert(self, alert: dict):
        """Escalate critical alert to HR and management"""
        try:
            if self.mongo:
                # Store with escalation flag
                self.mongo.db.stressAlerts.insert_one(alert)
                
                # Notify multiple recipients
                hr_admins = self.mongo.db.users.find({'role': {'$in': ['hr', 'admin']}})
                for admin in hr_admins:
                    if admin.get('email'):
                        self._send_email(
                            admin['email'],
                            f"URGENT: Critical Stress Alert - Immediate Action Required",
                            alert,
                            priority='HIGH'
                        )
                
                print(f"[OK] ESCALATED alert for {alert['userId']}: {alert['message']}")
        except Exception as e:
            print(f"[ERROR] Escalating alert: {e}")
    
    def _send_email(self, recipient: str, subject: str, alert: dict, priority: str = 'NORMAL'):
        """Send email notification"""
        if not self.email_enabled:
            return
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = os.getenv('SMTP_FROM_EMAIL')
            msg['To'] = recipient
            msg['Priority'] = priority
            
            # HTML email template
            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                  <h2 style="color: {'#d32f2f' if alert['severity'] == 'CRITICAL' else '#f57c00'};">
                    {alert['severity']} - Employee Stress Alert
                  </h2>
                  <p><strong>Stress Level:</strong> {(alert['stressLevel']*100):.1f}%</p>
                  <p><strong>Severity:</strong> {alert['severity']}</p>
                  <p><strong>Time:</strong> {alert['timestamp']}</p>
                  <p><strong>Message:</strong> {alert['message']}</p>
                  <p><strong>Description:</strong> {alert['description']}</p>
                  
                  {'<p style="color: red;"><strong>ACTION REQUIRED: This alert has been escalated and requires immediate attention.</strong></p>' if alert.get('escalated') else ''}
                  
                  <p>Please log into the system for more details and to take action.</p>
                </div>
              </body>
            </html>
            """
            
            msg.attach(MIMEText(html, 'html'))
            
            # Send email
            server = smtplib.SMTP(os.getenv('SMTP_SERVER'), int(os.getenv('SMTP_PORT', 587)))
            server.starttls()
            server.login(os.getenv('SMTP_EMAIL'), os.getenv('SMTP_PASSWORD'))
            server.send_message(msg)
            server.quit()
            
            print(f"[OK] Email sent to {recipient}")
        except Exception as e:
            print(f"[WARNING] Could not send email: {e}")
    
    def get_alerts_for_user(self, user_id: str, days: int = 7):
        """Get recent alerts for a user"""
        try:
            if not self.mongo:
                return []
            
            from datetime import timedelta
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            alerts = list(self.mongo.db.stressAlerts.find({
                'userId': user_id,
                'timestamp': {'$gte': cutoff_date.isoformat()}
            }).sort('timestamp', -1).limit(100))
            
            return alerts
        except Exception as e:
            print(f"[ERROR] Fetching alerts: {e}")
            return []
    
    def get_all_alerts(self, severity: str = None, days: int = 7):
        """Get all alerts across organization"""
        try:
            if not self.mongo:
                return []
            
            from datetime import timedelta
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            query = {'timestamp': {'$gte': cutoff_date.isoformat()}}
            if severity:
                query['severity'] = severity
            
            alerts = list(self.mongo.db.stressAlerts.find(query).sort('timestamp', -1).limit(500))
            return alerts
        except Exception as e:
            print(f"[ERROR] Fetching all alerts: {e}")
            return []

# Singleton instance
_alert_service = None

def get_alert_service(mongo=None):
    global _alert_service
    if _alert_service is None:
        _alert_service = StressAlertService(mongo)
    return _alert_service
