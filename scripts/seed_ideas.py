#!/usr/bin/env python3
"""
Seed script for Ideas Hub test data.

This script creates 45 realistic test ideas in Cosmos DB to demonstrate
all features of the Ideas Hub, including all 4 recommendation classes:
- HIGH_LEVERAGE: High impact (>=70) + High feasibility (>=70)
- QUICK_WIN: Medium impact (>=50) + High feasibility (>=70)
- STRATEGIC: High impact (>=70) + Lower feasibility (<70)
- EVALUATE: Lower scores, needs review

Usage:
    python scripts/seed_ideas.py

Environment variables required:
    - AZURE_COSMOS_ENDPOINT: Cosmos DB endpoint
    - AZURE_COSMOS_KEY: Cosmos DB key (or use managed identity)
    - AZURE_IDEAS_DATABASE: Database name
    - AZURE_IDEAS_CONTAINER: Container name (default: ideas)
"""

import asyncio
import os
import sys
import time
import uuid
from typing import Any

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app", "backend"))

from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential

from ideas.models import Idea, IdeaStatus, RecommendationClass


# Test data: 45 ideas distributed across all 4 recommendation classes
# Each idea includes realistic KPI estimates that will produce the desired scores
TEST_IDEAS: list[dict[str, Any]] = [
    # ============================================================
    # HIGH LEVERAGE IDEAS (12 ideas)
    # High impact (>=70) + High feasibility (>=70)
    # These are the "stars" - implement immediately
    # ============================================================
    {
        "title": "Automated Invoice Processing with AI",
        "description": "Implement an AI-powered system to automatically extract data from invoices, validate against purchase orders, and route for approval. Uses Azure Document Intelligence for OCR and GPT-4 for data extraction.",
        "problem_description": "Manual invoice processing takes 15-20 minutes per invoice. With 500+ invoices monthly, this consumes significant staff time and introduces errors.",
        "expected_benefit": "Reduce processing time by 80%, eliminate data entry errors, and free up 2 FTEs for higher-value work.",
        "affected_processes": ["Accounts Payable", "Procurement", "Financial Reporting"],
        "target_users": ["Finance Team", "Procurement Team"],
        "department": "Finance",
        "impact_score": 85.0,
        "feasibility_score": 82.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["automation", "AI", "finance", "cost-reduction"],
        "kpi_estimates": {"timeSavingsHours": 400, "costReductionEur": 400000, "qualityImprovementPercent": 85, "employeeSatisfactionImpact": 70, "scalabilityPotential": 80, "implementationEffortDays": 30, "riskLevel": "low"},
    },
    {
        "title": "Self-Service Password Reset Portal",
        "description": "Deploy a secure self-service password reset portal integrated with Azure AD, allowing employees to reset passwords without IT support tickets.",
        "problem_description": "IT helpdesk receives 50+ password reset requests weekly, each taking 10-15 minutes to resolve.",
        "expected_benefit": "Reduce helpdesk tickets by 40%, improve employee productivity, and enhance security with MFA verification.",
        "affected_processes": ["IT Support", "Employee Onboarding", "Security"],
        "target_users": ["All Employees", "IT Helpdesk"],
        "department": "IT",
        "impact_score": 78.0,
        "feasibility_score": 88.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["IT", "self-service", "security", "productivity"],
        "kpi_estimates": {"timeSavingsHours": 350, "costReductionEur": 350000, "qualityImprovementPercent": 75, "employeeSatisfactionImpact": 60, "scalabilityPotential": 75, "implementationEffortDays": 15, "riskLevel": "low"},
    },
    {
        "title": "Centralized Knowledge Base with AI Search",
        "description": "Create a company-wide knowledge base using SharePoint and Azure AI Search, enabling employees to find answers to common questions instantly.",
        "problem_description": "Information is scattered across emails, shared drives, and individual documents. Employees spend 2+ hours daily searching for information.",
        "expected_benefit": "Reduce time spent searching by 60%, improve knowledge sharing, and preserve institutional knowledge.",
        "affected_processes": ["Knowledge Management", "Employee Training", "Customer Support"],
        "target_users": ["All Employees"],
        "department": "HR",
        "impact_score": 82.0,
        "feasibility_score": 75.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["knowledge-management", "AI", "productivity", "collaboration"],
        "kpi_estimates": {"timeSavingsHours": 380, "costReductionEur": 380000, "qualityImprovementPercent": 80, "employeeSatisfactionImpact": 65, "scalabilityPotential": 80, "implementationEffortDays": 50, "riskLevel": "low"},
    },
    {
        "title": "Automated Meeting Room Booking System",
        "description": "Implement a smart meeting room booking system with Outlook integration, real-time availability display, and automatic release of unused bookings.",
        "problem_description": "Meeting rooms are often double-booked or reserved but unused. Employees waste time finding available spaces.",
        "expected_benefit": "Increase room utilization by 35%, eliminate booking conflicts, and save 30 minutes per employee weekly.",
        "affected_processes": ["Facility Management", "Meeting Scheduling"],
        "target_users": ["All Employees", "Facility Management"],
        "department": "Operations",
        "impact_score": 72.0,
        "feasibility_score": 85.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["facilities", "automation", "productivity"],
        "kpi_estimates": {"timeSavingsHours": 320, "costReductionEur": 320000, "qualityImprovementPercent": 70, "employeeSatisfactionImpact": 55, "scalabilityPotential": 70, "implementationEffortDays": 20, "riskLevel": "low"},
    },
    {
        "title": "Digital Expense Report Submission",
        "description": "Replace paper-based expense reports with a mobile app that captures receipts, auto-categorizes expenses, and integrates with SAP.",
        "problem_description": "Paper expense reports take 45 minutes to complete and 2 weeks to process. Receipts are often lost.",
        "expected_benefit": "Reduce submission time by 70%, processing time by 80%, and eliminate lost receipt issues.",
        "affected_processes": ["Expense Management", "Accounts Payable", "Travel Management"],
        "target_users": ["All Employees", "Finance Team"],
        "department": "Finance",
        "impact_score": 76.0,
        "feasibility_score": 80.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["mobile", "automation", "finance", "employee-experience"],
        "kpi_estimates": {"timeSavingsHours": 340, "costReductionEur": 340000, "qualityImprovementPercent": 72, "employeeSatisfactionImpact": 58, "scalabilityPotential": 72, "implementationEffortDays": 30, "riskLevel": "low"},
    },
    {
        "title": "Automated Onboarding Workflow",
        "description": "Create an automated onboarding workflow that provisions accounts, assigns training, schedules meetings, and tracks completion across all systems.",
        "problem_description": "New employee onboarding involves 15+ manual steps across 8 systems, often taking 2-3 days to complete.",
        "expected_benefit": "Reduce onboarding time to 2 hours, ensure 100% compliance, and improve new hire experience.",
        "affected_processes": ["HR Onboarding", "IT Provisioning", "Training"],
        "target_users": ["HR Team", "IT Team", "New Employees"],
        "department": "HR",
        "impact_score": 80.0,
        "feasibility_score": 72.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["HR", "automation", "onboarding", "compliance"],
        "kpi_estimates": {"timeSavingsHours": 360, "costReductionEur": 360000, "qualityImprovementPercent": 78, "employeeSatisfactionImpact": 62, "scalabilityPotential": 78, "implementationEffortDays": 55, "riskLevel": "low"},
    },
    {
        "title": "Real-time Inventory Dashboard",
        "description": "Build a real-time inventory dashboard connecting warehouse systems, providing instant visibility into stock levels, reorder points, and trends.",
        "problem_description": "Inventory data is updated daily in batch, leading to stockouts and overordering. Manual checks take 4 hours daily.",
        "expected_benefit": "Reduce stockouts by 50%, decrease excess inventory by 25%, and eliminate manual checking.",
        "affected_processes": ["Inventory Management", "Procurement", "Warehouse Operations"],
        "target_users": ["Warehouse Team", "Procurement Team", "Management"],
        "department": "Operations",
        "impact_score": 84.0,
        "feasibility_score": 78.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["inventory", "real-time", "dashboard", "operations"],
        "kpi_estimates": {"timeSavingsHours": 390, "costReductionEur": 390000, "qualityImprovementPercent": 82, "employeeSatisfactionImpact": 68, "scalabilityPotential": 82, "implementationEffortDays": 40, "riskLevel": "low"},
    },
    {
        "title": "Customer Feedback Analysis with AI",
        "description": "Implement AI-powered sentiment analysis for customer feedback across all channels, with automatic categorization and trend detection.",
        "problem_description": "Customer feedback is manually reviewed, missing patterns and taking weeks to identify issues.",
        "expected_benefit": "Identify issues 10x faster, improve customer satisfaction by 15%, and reduce churn.",
        "affected_processes": ["Customer Service", "Product Development", "Quality Assurance"],
        "target_users": ["Customer Service Team", "Product Team", "Management"],
        "department": "Customer Service",
        "impact_score": 79.0,
        "feasibility_score": 76.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["AI", "customer-experience", "analytics", "sentiment"],
        "kpi_estimates": {"timeSavingsHours": 355, "costReductionEur": 355000, "qualityImprovementPercent": 76, "employeeSatisfactionImpact": 60, "scalabilityPotential": 76, "implementationEffortDays": 45, "riskLevel": "low"},
    },
    {
        "title": "Automated Contract Renewal Reminders",
        "description": "Create an automated system to track contract expiration dates and send timely reminders to stakeholders for renewal negotiations.",
        "problem_description": "Contracts often auto-renew at unfavorable terms because renewal dates are missed. Last year cost us 50K EUR.",
        "expected_benefit": "Never miss a renewal deadline, save 50K+ EUR annually, and improve vendor negotiations.",
        "affected_processes": ["Contract Management", "Procurement", "Legal"],
        "target_users": ["Procurement Team", "Legal Team", "Department Heads"],
        "department": "Legal",
        "impact_score": 75.0,
        "feasibility_score": 88.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["contracts", "automation", "cost-savings", "compliance"],
        "kpi_estimates": {"timeSavingsHours": 330, "costReductionEur": 330000, "qualityImprovementPercent": 72, "employeeSatisfactionImpact": 55, "scalabilityPotential": 72, "implementationEffortDays": 10, "riskLevel": "low"},
    },
    {
        "title": "Unified Communication Platform Migration",
        "description": "Consolidate Slack, email, and phone systems into Microsoft Teams, reducing tool fragmentation and improving collaboration.",
        "problem_description": "Employees use 4+ communication tools, missing messages and duplicating efforts. Integration is poor.",
        "expected_benefit": "Reduce communication overhead by 30%, improve response times, and save 100K EUR in licensing.",
        "affected_processes": ["Internal Communication", "Collaboration", "IT Management"],
        "target_users": ["All Employees"],
        "department": "IT",
        "impact_score": 81.0,
        "feasibility_score": 74.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["communication", "collaboration", "cost-reduction", "Teams"],
        "kpi_estimates": {"timeSavingsHours": 370, "costReductionEur": 370000, "qualityImprovementPercent": 79, "employeeSatisfactionImpact": 64, "scalabilityPotential": 79, "implementationEffortDays": 55, "riskLevel": "low"},
    },
    {
        "title": "Predictive Maintenance for Production Equipment",
        "description": "Deploy IoT sensors and ML models to predict equipment failures before they occur, enabling proactive maintenance.",
        "problem_description": "Unplanned equipment downtime costs 10K EUR per hour. Current maintenance is reactive.",
        "expected_benefit": "Reduce unplanned downtime by 70%, extend equipment life by 20%, and save 200K EUR annually.",
        "affected_processes": ["Maintenance", "Production", "Quality Control"],
        "target_users": ["Maintenance Team", "Production Managers"],
        "department": "Production",
        "impact_score": 88.0,
        "feasibility_score": 71.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["IoT", "predictive", "maintenance", "production"],
        "kpi_estimates": {"timeSavingsHours": 420, "costReductionEur": 420000, "qualityImprovementPercent": 88, "employeeSatisfactionImpact": 72, "scalabilityPotential": 88, "implementationEffortDays": 60, "riskLevel": "low"},
    },
    {
        "title": "Automated Quality Control with Computer Vision",
        "description": "Implement computer vision system to automatically inspect products on the production line, detecting defects in real-time.",
        "problem_description": "Manual quality inspection catches only 85% of defects and creates a bottleneck in production.",
        "expected_benefit": "Increase defect detection to 99%, speed up inspection by 5x, and reduce customer returns.",
        "affected_processes": ["Quality Control", "Production", "Customer Service"],
        "target_users": ["Quality Team", "Production Team"],
        "department": "Production",
        "impact_score": 86.0,
        "feasibility_score": 73.0,
        "recommendation_class": RecommendationClass.HIGH_LEVERAGE.value,
        "tags": ["AI", "computer-vision", "quality", "automation"],
        "kpi_estimates": {"timeSavingsHours": 400, "costReductionEur": 400000, "qualityImprovementPercent": 85, "employeeSatisfactionImpact": 70, "scalabilityPotential": 85, "implementationEffortDays": 55, "riskLevel": "low"},
    },

    # ============================================================
    # QUICK WIN IDEAS (11 ideas)
    # Medium impact (50-69) + High feasibility (>=70)
    # Easy to implement with good returns
    # KPI values designed to produce: Impact 50-69, Feasibility 75-95
    # - Medium timeSavings (100-250), medium costReduction (100k-250k)
    # - Medium quality (40-60%), very low effort (1-30 days), low risk
    # ============================================================
    {
        "title": "Standardized Email Signature Templates",
        "description": "Create and deploy standardized email signature templates for all employees with automatic updates for contact info changes.",
        "problem_description": "Email signatures are inconsistent, some missing legal disclaimers. Manual updates are time-consuming.",
        "expected_benefit": "Ensure brand consistency, legal compliance, and save 2 hours per employee annually.",
        "affected_processes": ["Corporate Communications", "Legal Compliance"],
        "target_users": ["All Employees", "Marketing Team"],
        "department": "Marketing",
        "impact_score": 52.0,
        "feasibility_score": 95.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["branding", "compliance", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 100, "costReductionEur": 100000, "qualityImprovementPercent": 40, "employeeSatisfactionImpact": 30, "scalabilityPotential": 40, "implementationEffortDays": 3, "riskLevel": "low"},
    },
    {
        "title": "Automated Out-of-Office Reminders",
        "description": "Send automatic reminders to employees to set out-of-office messages before planned absences.",
        "problem_description": "Employees often forget to set OOO messages, causing communication delays and customer frustration.",
        "expected_benefit": "Reduce missed OOO settings by 90%, improve customer communication.",
        "affected_processes": ["HR", "Customer Communication"],
        "target_users": ["All Employees"],
        "department": "HR",
        "impact_score": 55.0,
        "feasibility_score": 92.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["automation", "communication", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 120, "costReductionEur": 120000, "qualityImprovementPercent": 45, "employeeSatisfactionImpact": 35, "scalabilityPotential": 45, "implementationEffortDays": 5, "riskLevel": "low"},
    },
    {
        "title": "Shared Calendar for Conference Rooms",
        "description": "Create shared Outlook calendars for all conference rooms visible to everyone, showing real-time availability.",
        "problem_description": "Employees walk to rooms to check availability. Double bookings occur frequently.",
        "expected_benefit": "Save 15 minutes per employee weekly, eliminate double bookings.",
        "affected_processes": ["Facility Management", "Meeting Scheduling"],
        "target_users": ["All Employees"],
        "department": "Operations",
        "impact_score": 58.0,
        "feasibility_score": 90.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["facilities", "productivity", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 140, "costReductionEur": 140000, "qualityImprovementPercent": 48, "employeeSatisfactionImpact": 38, "scalabilityPotential": 48, "implementationEffortDays": 8, "riskLevel": "low"},
    },
    {
        "title": "Weekly IT Tips Newsletter",
        "description": "Launch a weekly newsletter with IT tips, shortcuts, and best practices to improve employee tech skills.",
        "problem_description": "Employees underutilize available tools. Same questions asked repeatedly to IT support.",
        "expected_benefit": "Reduce basic IT support tickets by 20%, improve tool adoption.",
        "affected_processes": ["IT Support", "Employee Training"],
        "target_users": ["All Employees"],
        "department": "IT",
        "impact_score": 50.0,
        "feasibility_score": 88.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["training", "IT", "communication", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 90, "costReductionEur": 90000, "qualityImprovementPercent": 38, "employeeSatisfactionImpact": 28, "scalabilityPotential": 38, "implementationEffortDays": 10, "riskLevel": "low"},
    },
    {
        "title": "Digital Business Card Exchange",
        "description": "Implement QR code-based digital business cards for employees to share contact info at events.",
        "problem_description": "Paper business cards are outdated, expensive to print, and contact info becomes stale.",
        "expected_benefit": "Save 5K EUR annually on printing, always up-to-date contact info.",
        "affected_processes": ["Sales", "Marketing", "Networking"],
        "target_users": ["Sales Team", "Management", "Marketing"],
        "department": "Sales",
        "impact_score": 54.0,
        "feasibility_score": 85.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["digital", "sales", "cost-reduction", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 110, "costReductionEur": 110000, "qualityImprovementPercent": 42, "employeeSatisfactionImpact": 32, "scalabilityPotential": 42, "implementationEffortDays": 14, "riskLevel": "low"},
    },
    {
        "title": "Automated Birthday and Anniversary Notifications",
        "description": "Send automatic notifications to managers about team member birthdays and work anniversaries.",
        "problem_description": "Managers often forget important dates, missing opportunities to recognize employees.",
        "expected_benefit": "Improve employee morale and recognition culture.",
        "affected_processes": ["HR", "Employee Engagement"],
        "target_users": ["Managers", "HR Team"],
        "department": "HR",
        "impact_score": 51.0,
        "feasibility_score": 94.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["HR", "engagement", "automation", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 95, "costReductionEur": 95000, "qualityImprovementPercent": 39, "employeeSatisfactionImpact": 29, "scalabilityPotential": 39, "implementationEffortDays": 4, "riskLevel": "low"},
    },
    {
        "title": "Printer Usage Dashboard",
        "description": "Create a dashboard showing printer usage by department to identify waste and optimize resources.",
        "problem_description": "No visibility into printing costs. Some departments print excessively.",
        "expected_benefit": "Reduce printing costs by 15% through awareness and accountability.",
        "affected_processes": ["Facility Management", "Cost Control"],
        "target_users": ["Department Heads", "Finance Team"],
        "department": "Operations",
        "impact_score": 56.0,
        "feasibility_score": 82.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["analytics", "cost-reduction", "sustainability", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 130, "costReductionEur": 130000, "qualityImprovementPercent": 46, "employeeSatisfactionImpact": 36, "scalabilityPotential": 46, "implementationEffortDays": 18, "riskLevel": "low"},
    },
    {
        "title": "Standardized Project Status Report Template",
        "description": "Create a standardized template for project status reports with automated data pull from project management tools.",
        "problem_description": "Project reports vary in format and quality. Managers spend hours compiling data.",
        "expected_benefit": "Save 2 hours per project manager weekly, improve report consistency.",
        "affected_processes": ["Project Management", "Reporting"],
        "target_users": ["Project Managers", "Management"],
        "department": "PMO",
        "impact_score": 60.0,
        "feasibility_score": 78.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["templates", "reporting", "productivity", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 160, "costReductionEur": 160000, "qualityImprovementPercent": 52, "employeeSatisfactionImpact": 42, "scalabilityPotential": 52, "implementationEffortDays": 25, "riskLevel": "low"},
    },
    {
        "title": "Employee Directory with Photos",
        "description": "Enhance the employee directory with photos, skills, and interests to improve internal networking.",
        "problem_description": "Hard to identify colleagues, especially in large or remote teams.",
        "expected_benefit": "Improve collaboration and team cohesion, especially for remote workers.",
        "affected_processes": ["HR", "Internal Communication"],
        "target_users": ["All Employees"],
        "department": "HR",
        "impact_score": 53.0,
        "feasibility_score": 86.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["HR", "collaboration", "culture", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 105, "costReductionEur": 105000, "qualityImprovementPercent": 41, "employeeSatisfactionImpact": 31, "scalabilityPotential": 41, "implementationEffortDays": 12, "riskLevel": "low"},
    },
    {
        "title": "Automated Timesheet Reminders",
        "description": "Send automatic reminders to employees who haven't submitted timesheets by the deadline.",
        "problem_description": "30% of timesheets are submitted late, delaying payroll and project billing.",
        "expected_benefit": "Reduce late submissions to under 5%, improve payroll accuracy.",
        "affected_processes": ["Payroll", "Project Billing", "HR"],
        "target_users": ["All Employees", "HR Team", "Finance Team"],
        "department": "HR",
        "impact_score": 62.0,
        "feasibility_score": 91.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["automation", "payroll", "compliance", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 180, "costReductionEur": 180000, "qualityImprovementPercent": 55, "employeeSatisfactionImpact": 45, "scalabilityPotential": 55, "implementationEffortDays": 6, "riskLevel": "low"},
    },
    {
        "title": "FAQ Chatbot for HR Questions",
        "description": "Deploy a simple chatbot to answer common HR questions about policies, benefits, and procedures.",
        "problem_description": "HR receives 100+ repetitive questions weekly about the same topics.",
        "expected_benefit": "Reduce HR inquiry volume by 40%, provide 24/7 answers to employees.",
        "affected_processes": ["HR Support", "Employee Self-Service"],
        "target_users": ["All Employees", "HR Team"],
        "department": "HR",
        "impact_score": 65.0,
        "feasibility_score": 75.0,
        "recommendation_class": RecommendationClass.QUICK_WIN.value,
        "tags": ["chatbot", "HR", "self-service", "quick-win"],
        "kpi_estimates": {"timeSavingsHours": 200, "costReductionEur": 200000, "qualityImprovementPercent": 58, "employeeSatisfactionImpact": 48, "scalabilityPotential": 58, "implementationEffortDays": 28, "riskLevel": "low"},
    },

    # ============================================================
    # STRATEGIC IDEAS (11 ideas)
    # High impact (>=70) + Lower feasibility (<70)
    # Worth pursuing but require significant investment
    # KPI values designed to produce: Impact 75-95, Feasibility 30-65
    # - High timeSavings (350-500), high costReduction (350k-500k)
    # - High quality (70-95%), high effort (180-365 days), high risk
    # ============================================================
    {
        "title": "Complete ERP System Modernization",
        "description": "Replace the legacy ERP system with a modern cloud-based solution (SAP S/4HANA or Microsoft Dynamics 365).",
        "problem_description": "Current ERP is 15 years old, lacks integration capabilities, and maintenance costs are rising 20% annually.",
        "expected_benefit": "Reduce operational costs by 30%, enable real-time analytics, and improve scalability.",
        "affected_processes": ["All Business Processes"],
        "target_users": ["All Departments"],
        "department": "IT",
        "impact_score": 95.0,
        "feasibility_score": 45.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["ERP", "transformation", "strategic", "cloud"],
        "kpi_estimates": {"timeSavingsHours": 480, "costReductionEur": 480000, "qualityImprovementPercent": 92, "employeeSatisfactionImpact": 80, "scalabilityPotential": 95, "implementationEffortDays": 340, "riskLevel": "high"},
    },
    {
        "title": "AI-Powered Demand Forecasting",
        "description": "Implement machine learning models to predict customer demand with 95% accuracy, optimizing inventory and production.",
        "problem_description": "Current forecasting is 70% accurate, leading to overproduction or stockouts costing 500K EUR annually.",
        "expected_benefit": "Improve forecast accuracy to 95%, reduce inventory costs by 25%, eliminate stockouts.",
        "affected_processes": ["Demand Planning", "Production", "Inventory Management"],
        "target_users": ["Supply Chain Team", "Production Team"],
        "department": "Supply Chain",
        "impact_score": 88.0,
        "feasibility_score": 55.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["AI", "forecasting", "supply-chain", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 420, "costReductionEur": 420000, "qualityImprovementPercent": 85, "employeeSatisfactionImpact": 70, "scalabilityPotential": 88, "implementationEffortDays": 200, "riskLevel": "high"},
    },
    {
        "title": "Zero Trust Security Architecture",
        "description": "Implement a comprehensive zero trust security model across all systems and networks.",
        "problem_description": "Current perimeter-based security is inadequate for remote work and cloud services. Security incidents increasing.",
        "expected_benefit": "Reduce security incidents by 80%, enable secure remote work, meet compliance requirements.",
        "affected_processes": ["IT Security", "Access Management", "Compliance"],
        "target_users": ["All Employees", "IT Security Team"],
        "department": "IT Security",
        "impact_score": 92.0,
        "feasibility_score": 48.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["security", "zero-trust", "compliance", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 450, "costReductionEur": 450000, "qualityImprovementPercent": 90, "employeeSatisfactionImpact": 75, "scalabilityPotential": 92, "implementationEffortDays": 280, "riskLevel": "high"},
    },
    {
        "title": "Customer 360 Data Platform",
        "description": "Build a unified customer data platform integrating all touchpoints for a complete customer view.",
        "problem_description": "Customer data is siloed across 12 systems. No single view of customer interactions and preferences.",
        "expected_benefit": "Increase customer retention by 20%, improve cross-sell by 35%, personalize experiences.",
        "affected_processes": ["Sales", "Marketing", "Customer Service", "Product Development"],
        "target_users": ["Sales Team", "Marketing Team", "Customer Service"],
        "department": "Marketing",
        "impact_score": 85.0,
        "feasibility_score": 52.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["data-platform", "customer-experience", "analytics", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 400, "costReductionEur": 400000, "qualityImprovementPercent": 82, "employeeSatisfactionImpact": 68, "scalabilityPotential": 85, "implementationEffortDays": 220, "riskLevel": "high"},
    },
    {
        "title": "Robotic Process Automation at Scale",
        "description": "Deploy RPA across all departments to automate repetitive tasks, starting with finance and HR.",
        "problem_description": "Employees spend 40% of time on repetitive tasks that could be automated.",
        "expected_benefit": "Automate 50% of repetitive tasks, redeploy 20 FTEs to higher-value work.",
        "affected_processes": ["Finance", "HR", "Operations", "Customer Service"],
        "target_users": ["All Departments"],
        "department": "Operations",
        "impact_score": 82.0,
        "feasibility_score": 58.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["RPA", "automation", "transformation", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 380, "costReductionEur": 380000, "qualityImprovementPercent": 78, "employeeSatisfactionImpact": 65, "scalabilityPotential": 82, "implementationEffortDays": 180, "riskLevel": "high"},
    },
    {
        "title": "Global Supply Chain Visibility Platform",
        "description": "Implement end-to-end supply chain visibility with real-time tracking of all shipments and inventory.",
        "problem_description": "No visibility into supplier inventory or shipment status. Disruptions cause production delays.",
        "expected_benefit": "Reduce supply chain disruptions by 60%, improve delivery reliability to 98%.",
        "affected_processes": ["Supply Chain", "Procurement", "Production", "Logistics"],
        "target_users": ["Supply Chain Team", "Procurement Team", "Production"],
        "department": "Supply Chain",
        "impact_score": 78.0,
        "feasibility_score": 50.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["supply-chain", "visibility", "logistics", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 360, "costReductionEur": 360000, "qualityImprovementPercent": 75, "employeeSatisfactionImpact": 62, "scalabilityPotential": 78, "implementationEffortDays": 240, "riskLevel": "high"},
    },
    {
        "title": "Digital Twin for Manufacturing",
        "description": "Create digital twins of production lines to simulate changes and optimize operations virtually.",
        "problem_description": "Production changes require costly physical trials. Optimization is slow and expensive.",
        "expected_benefit": "Reduce trial costs by 70%, accelerate optimization cycles by 5x.",
        "affected_processes": ["Production", "Engineering", "Quality Control"],
        "target_users": ["Production Team", "Engineering Team"],
        "department": "Production",
        "impact_score": 80.0,
        "feasibility_score": 42.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["digital-twin", "manufacturing", "simulation", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 370, "costReductionEur": 370000, "qualityImprovementPercent": 76, "employeeSatisfactionImpact": 63, "scalabilityPotential": 80, "implementationEffortDays": 300, "riskLevel": "high"},
    },
    {
        "title": "Blockchain for Supply Chain Traceability",
        "description": "Implement blockchain-based traceability for product origin and authenticity verification.",
        "problem_description": "Cannot verify product authenticity or trace origin. Counterfeit products damage brand.",
        "expected_benefit": "Ensure 100% traceability, eliminate counterfeits, meet regulatory requirements.",
        "affected_processes": ["Supply Chain", "Quality Assurance", "Compliance"],
        "target_users": ["Supply Chain Team", "Quality Team", "Customers"],
        "department": "Supply Chain",
        "impact_score": 75.0,
        "feasibility_score": 38.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["blockchain", "traceability", "compliance", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 350, "costReductionEur": 350000, "qualityImprovementPercent": 72, "employeeSatisfactionImpact": 58, "scalabilityPotential": 75, "implementationEffortDays": 320, "riskLevel": "high"},
    },
    {
        "title": "Autonomous Warehouse Operations",
        "description": "Deploy autonomous mobile robots (AMRs) and automated storage systems in the main warehouse.",
        "problem_description": "Manual warehouse operations are slow, error-prone, and face labor shortages.",
        "expected_benefit": "Increase throughput by 200%, reduce errors by 95%, operate 24/7.",
        "affected_processes": ["Warehouse Operations", "Logistics", "Inventory Management"],
        "target_users": ["Warehouse Team", "Logistics Team"],
        "department": "Operations",
        "impact_score": 90.0,
        "feasibility_score": 35.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["automation", "robotics", "warehouse", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 440, "costReductionEur": 440000, "qualityImprovementPercent": 88, "employeeSatisfactionImpact": 72, "scalabilityPotential": 90, "implementationEffortDays": 350, "riskLevel": "high"},
    },
    {
        "title": "Enterprise AI Assistant Platform",
        "description": "Build a company-wide AI assistant that can answer questions, automate tasks, and provide insights across all systems.",
        "problem_description": "Employees spend hours searching for information and performing routine tasks manually.",
        "expected_benefit": "Save 2 hours per employee daily, democratize data access, accelerate decision-making.",
        "affected_processes": ["All Business Processes"],
        "target_users": ["All Employees"],
        "department": "IT",
        "impact_score": 93.0,
        "feasibility_score": 55.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["AI", "assistant", "productivity", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 460, "costReductionEur": 460000, "qualityImprovementPercent": 91, "employeeSatisfactionImpact": 78, "scalabilityPotential": 93, "implementationEffortDays": 200, "riskLevel": "high"},
    },
    {
        "title": "Carbon Neutral Operations Initiative",
        "description": "Comprehensive program to achieve carbon neutrality by 2030 through renewable energy, efficiency, and offsets.",
        "problem_description": "Increasing regulatory pressure and customer demand for sustainability. Current carbon footprint is 50K tons/year.",
        "expected_benefit": "Achieve carbon neutrality, improve brand image, meet regulatory requirements, reduce energy costs.",
        "affected_processes": ["All Operations", "Facilities", "Supply Chain"],
        "target_users": ["All Departments", "Sustainability Team"],
        "department": "Sustainability",
        "impact_score": 85.0,
        "feasibility_score": 45.0,
        "recommendation_class": RecommendationClass.STRATEGIC.value,
        "tags": ["sustainability", "carbon-neutral", "ESG", "strategic"],
        "kpi_estimates": {"timeSavingsHours": 400, "costReductionEur": 400000, "qualityImprovementPercent": 82, "employeeSatisfactionImpact": 68, "scalabilityPotential": 85, "implementationEffortDays": 340, "riskLevel": "high"},
    },

    # ============================================================
    # EVALUATE IDEAS (11 ideas)
    # Lower impact (<50 or 50-69 with low feasibility)
    # Need further analysis before proceeding
    # KPI values designed to produce: Impact 35-55, Feasibility 30-65
    # - Low timeSavings (20-100), low costReduction (20k-100k)
    # - Low quality (15-40%), medium-high effort (100-250 days), medium/high risk
    # ============================================================
    {
        "title": "Virtual Reality Training for Safety",
        "description": "Develop VR-based safety training modules for warehouse and production staff.",
        "problem_description": "Current safety training is classroom-based and not engaging. Retention is low.",
        "expected_benefit": "Improve training retention by 40%, reduce safety incidents.",
        "affected_processes": ["Training", "Safety", "HR"],
        "target_users": ["Warehouse Staff", "Production Staff"],
        "department": "HR",
        "impact_score": 45.0,
        "feasibility_score": 55.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["VR", "training", "safety", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 70, "costReductionEur": 70000, "qualityImprovementPercent": 32, "employeeSatisfactionImpact": 20, "scalabilityPotential": 35, "implementationEffortDays": 150, "riskLevel": "medium"},
    },
    {
        "title": "Gamification of Sales Training",
        "description": "Add gamification elements to sales training with leaderboards, badges, and rewards.",
        "problem_description": "Sales training completion rates are low. New hires take 6 months to become productive.",
        "expected_benefit": "Increase training completion by 50%, reduce ramp-up time by 2 months.",
        "affected_processes": ["Sales Training", "HR"],
        "target_users": ["Sales Team", "HR Team"],
        "department": "Sales",
        "impact_score": 48.0,
        "feasibility_score": 62.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["gamification", "training", "sales", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 80, "costReductionEur": 80000, "qualityImprovementPercent": 35, "employeeSatisfactionImpact": 25, "scalabilityPotential": 38, "implementationEffortDays": 120, "riskLevel": "medium"},
    },
    {
        "title": "Social Intranet Platform",
        "description": "Launch a social intranet with news feeds, communities, and employee recognition features.",
        "problem_description": "Current intranet is static and rarely used. Employee engagement is declining.",
        "expected_benefit": "Increase intranet usage by 200%, improve employee engagement scores.",
        "affected_processes": ["Internal Communication", "Employee Engagement"],
        "target_users": ["All Employees"],
        "department": "HR",
        "impact_score": 42.0,
        "feasibility_score": 65.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["intranet", "engagement", "communication", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 55, "costReductionEur": 55000, "qualityImprovementPercent": 28, "employeeSatisfactionImpact": 15, "scalabilityPotential": 30, "implementationEffortDays": 100, "riskLevel": "medium"},
    },
    {
        "title": "Drone Delivery for Internal Mail",
        "description": "Use drones to deliver internal mail and small packages between buildings on campus.",
        "problem_description": "Internal mail delivery takes 2 days between buildings. Urgent items require manual transport.",
        "expected_benefit": "Reduce delivery time to 30 minutes, free up mailroom staff.",
        "affected_processes": ["Facilities", "Internal Logistics"],
        "target_users": ["All Employees", "Mailroom Staff"],
        "department": "Operations",
        "impact_score": 35.0,
        "feasibility_score": 30.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["drones", "innovation", "logistics", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 30, "costReductionEur": 30000, "qualityImprovementPercent": 18, "employeeSatisfactionImpact": 5, "scalabilityPotential": 20, "implementationEffortDays": 250, "riskLevel": "high"},
    },
    {
        "title": "Wellness App for Employees",
        "description": "Develop a mobile app for employee wellness with fitness challenges, mental health resources, and health tracking.",
        "problem_description": "Employee wellness programs have low participation. Stress-related absences are increasing.",
        "expected_benefit": "Increase wellness program participation by 60%, reduce sick days by 10%.",
        "affected_processes": ["HR", "Employee Wellness"],
        "target_users": ["All Employees"],
        "department": "HR",
        "impact_score": 40.0,
        "feasibility_score": 58.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["wellness", "mobile", "HR", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 45, "costReductionEur": 45000, "qualityImprovementPercent": 24, "employeeSatisfactionImpact": 12, "scalabilityPotential": 28, "implementationEffortDays": 140, "riskLevel": "medium"},
    },
    {
        "title": "Voice-Controlled Meeting Room Equipment",
        "description": "Install voice-controlled systems in meeting rooms for lights, blinds, and AV equipment.",
        "problem_description": "Meeting room equipment is confusing. 10 minutes wasted at the start of each meeting.",
        "expected_benefit": "Save 10 minutes per meeting, improve meeting experience.",
        "affected_processes": ["Facilities", "Meeting Management"],
        "target_users": ["All Employees"],
        "department": "Operations",
        "impact_score": 38.0,
        "feasibility_score": 52.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["voice-control", "facilities", "meetings", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 40, "costReductionEur": 40000, "qualityImprovementPercent": 22, "employeeSatisfactionImpact": 10, "scalabilityPotential": 25, "implementationEffortDays": 160, "riskLevel": "medium"},
    },
    {
        "title": "Augmented Reality for Maintenance",
        "description": "Provide AR glasses to maintenance technicians with real-time repair instructions and remote expert support.",
        "problem_description": "Technicians often need to consult manuals or call experts, extending repair times.",
        "expected_benefit": "Reduce repair time by 30%, improve first-time fix rate.",
        "affected_processes": ["Maintenance", "Training"],
        "target_users": ["Maintenance Team"],
        "department": "Operations",
        "impact_score": 55.0,
        "feasibility_score": 40.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["AR", "maintenance", "innovation", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 95, "costReductionEur": 95000, "qualityImprovementPercent": 38, "employeeSatisfactionImpact": 28, "scalabilityPotential": 42, "implementationEffortDays": 220, "riskLevel": "high"},
    },
    {
        "title": "Personalized Learning Paths with AI",
        "description": "Use AI to create personalized learning paths for each employee based on their role, skills, and career goals.",
        "problem_description": "Training is one-size-fits-all. Employees don't know what skills to develop.",
        "expected_benefit": "Increase training relevance by 50%, improve skill development.",
        "affected_processes": ["Training", "Career Development", "HR"],
        "target_users": ["All Employees", "HR Team"],
        "department": "HR",
        "impact_score": 52.0,
        "feasibility_score": 45.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["AI", "learning", "personalization", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 85, "costReductionEur": 85000, "qualityImprovementPercent": 36, "employeeSatisfactionImpact": 26, "scalabilityPotential": 40, "implementationEffortDays": 200, "riskLevel": "high"},
    },
    {
        "title": "Biometric Access Control",
        "description": "Replace badge-based access with biometric authentication (fingerprint/facial recognition).",
        "problem_description": "Badges are lost, shared, or forgotten. Security incidents from tailgating.",
        "expected_benefit": "Eliminate badge-related issues, improve security.",
        "affected_processes": ["Security", "Facilities"],
        "target_users": ["All Employees", "Security Team"],
        "department": "Security",
        "impact_score": 45.0,
        "feasibility_score": 48.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["biometrics", "security", "access-control", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 65, "costReductionEur": 65000, "qualityImprovementPercent": 30, "employeeSatisfactionImpact": 18, "scalabilityPotential": 33, "implementationEffortDays": 180, "riskLevel": "medium"},
    },
    {
        "title": "Electric Vehicle Fleet Transition",
        "description": "Replace company vehicles with electric vehicles and install charging infrastructure.",
        "problem_description": "Fuel costs are rising. Sustainability goals require emission reduction.",
        "expected_benefit": "Reduce fuel costs by 60%, meet sustainability targets.",
        "affected_processes": ["Fleet Management", "Facilities", "Sustainability"],
        "target_users": ["Fleet Users", "Facilities Team"],
        "department": "Operations",
        "impact_score": 48.0,
        "feasibility_score": 42.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["EV", "sustainability", "fleet", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 75, "costReductionEur": 75000, "qualityImprovementPercent": 34, "employeeSatisfactionImpact": 22, "scalabilityPotential": 36, "implementationEffortDays": 230, "riskLevel": "high"},
    },
    {
        "title": "Sentiment Analysis for Internal Surveys",
        "description": "Apply NLP sentiment analysis to employee survey responses for deeper insights.",
        "problem_description": "Survey analysis is manual and superficial. Nuances in feedback are missed.",
        "expected_benefit": "Identify issues 3x faster, improve action planning.",
        "affected_processes": ["HR", "Employee Engagement"],
        "target_users": ["HR Team", "Management"],
        "department": "HR",
        "impact_score": 42.0,
        "feasibility_score": 60.0,
        "recommendation_class": RecommendationClass.EVALUATE.value,
        "tags": ["NLP", "surveys", "analytics", "evaluate"],
        "kpi_estimates": {"timeSavingsHours": 50, "costReductionEur": 50000, "qualityImprovementPercent": 26, "employeeSatisfactionImpact": 14, "scalabilityPotential": 29, "implementationEffortDays": 110, "riskLevel": "medium"},
    },
]


# Departments and submitter names for variety
DEPARTMENTS = ["IT", "Finance", "HR", "Operations", "Sales", "Marketing", "Production", "Supply Chain", "Customer Service", "Legal"]
SUBMITTER_NAMES = [
    "Anna Mueller", "Thomas Schmidt", "Maria Weber", "Michael Fischer", "Julia Wagner",
    "Stefan Becker", "Laura Hoffmann", "Markus Schulz", "Sophie Koch", "Daniel Richter",
    "Emma Bauer", "Felix Wolf", "Lena Schroeder", "Maximilian Neumann", "Hannah Schwarz"
]


async def seed_ideas():
    """
    Seed the Cosmos DB with test ideas.
    """
    # Get environment variables
    cosmos_endpoint = os.getenv("AZURE_COSMOS_ENDPOINT")
    cosmos_key = os.getenv("AZURE_COSMOS_KEY")
    database_name = os.getenv("AZURE_IDEAS_DATABASE")
    container_name = os.getenv("AZURE_IDEAS_CONTAINER", "ideas")

    if not cosmos_endpoint:
        print("Error: AZURE_COSMOS_ENDPOINT environment variable is required")
        sys.exit(1)

    if not database_name:
        print("Error: AZURE_IDEAS_DATABASE environment variable is required")
        sys.exit(1)

    print(f"Connecting to Cosmos DB at {cosmos_endpoint}")
    print(f"Database: {database_name}, Container: {container_name}")

    # Create Cosmos client
    if cosmos_key:
        client = CosmosClient(cosmos_endpoint, credential=cosmos_key)
    else:
        print("Using DefaultAzureCredential for authentication")
        credential = DefaultAzureCredential()
        client = CosmosClient(cosmos_endpoint, credential=credential)

    try:
        # Get database and container
        database = client.get_database_client(database_name)
        container = database.get_container_client(container_name)

        # Create ideas
        created_count = 0
        base_time = int(time.time() * 1000)

        for i, idea_data in enumerate(TEST_IDEAS):
            # Create unique ID and timestamps
            idea_id = str(uuid.uuid4())
            # Spread creation times over the last 30 days
            created_at = base_time - (i * 24 * 60 * 60 * 1000 // 2)  # ~12 hours apart
            updated_at = created_at + (i * 1000 * 60 * 30)  # Some time after creation

            # Assign submitter and department
            submitter_name = SUBMITTER_NAMES[i % len(SUBMITTER_NAMES)]
            submitter_id = f"user_{submitter_name.lower().replace(' ', '_')}@company.com"

            # Use department from idea data or assign one
            department = idea_data.get("department", DEPARTMENTS[i % len(DEPARTMENTS)])

            # Determine status based on recommendation class
            rec_class = idea_data.get("recommendation_class", RecommendationClass.UNCLASSIFIED.value)
            if rec_class == RecommendationClass.HIGH_LEVERAGE.value:
                status = IdeaStatus.APPROVED.value if i % 3 == 0 else IdeaStatus.UNDER_REVIEW.value
            elif rec_class == RecommendationClass.QUICK_WIN.value:
                status = IdeaStatus.IMPLEMENTED.value if i % 4 == 0 else IdeaStatus.APPROVED.value
            elif rec_class == RecommendationClass.STRATEGIC.value:
                status = IdeaStatus.UNDER_REVIEW.value
            else:
                status = IdeaStatus.SUBMITTED.value

            # Create the Cosmos DB document
            cosmos_item = {
                "id": idea_id,
                "ideaId": idea_id,
                "type": "idea",
                "submitterId": submitter_id,
                "submitterName": submitter_name,
                "title": idea_data["title"],
                "description": idea_data["description"],
                "problemDescription": idea_data.get("problem_description", ""),
                "expectedBenefit": idea_data.get("expected_benefit", ""),
                "affectedProcesses": idea_data.get("affected_processes", []),
                "targetUsers": idea_data.get("target_users", []),
                "department": department,
                "status": status,
                "createdAt": created_at,
                "updatedAt": updated_at,
                "summary": f"AI-generated summary: {idea_data['description'][:150]}...",
                "tags": idea_data.get("tags", []),
                "embedding": [],  # Would be generated by the service
                "impactScore": idea_data.get("impact_score", 0.0),
                "feasibilityScore": idea_data.get("feasibility_score", 0.0),
                "recommendationClass": rec_class,
                "kpiEstimates": idea_data.get("kpi_estimates", {}),
                "clusterLabel": "",
                "analyzedAt": updated_at,
                "analysisVersion": "1.0.0",
            }

            try:
                await container.create_item(body=cosmos_item)
                created_count += 1
                print(f"Created idea {created_count}/{len(TEST_IDEAS)}: {idea_data['title'][:50]}...")
            except Exception as e:
                print(f"Error creating idea '{idea_data['title']}': {e}")

        print(f"\nSuccessfully created {created_count} ideas")
        print(f"\nIdeas by recommendation class:")
        print(f"  - HIGH_LEVERAGE: 12 ideas")
        print(f"  - QUICK_WIN: 11 ideas")
        print(f"  - STRATEGIC: 11 ideas")
        print(f"  - EVALUATE: 11 ideas")
        print(f"  - Total: 45 ideas")

    finally:
        await client.close()


async def clear_ideas():
    """
    Clear all existing ideas from the container.
    """
    cosmos_endpoint = os.getenv("AZURE_COSMOS_ENDPOINT")
    cosmos_key = os.getenv("AZURE_COSMOS_KEY")
    database_name = os.getenv("AZURE_IDEAS_DATABASE")
    container_name = os.getenv("AZURE_IDEAS_CONTAINER", "ideas")

    if not cosmos_endpoint or not database_name:
        print("Error: Required environment variables not set")
        sys.exit(1)

    if cosmos_key:
        client = CosmosClient(cosmos_endpoint, credential=cosmos_key)
    else:
        credential = DefaultAzureCredential()
        client = CosmosClient(cosmos_endpoint, credential=credential)

    try:
        database = client.get_database_client(database_name)
        container = database.get_container_client(container_name)

        # Query all ideas - use partition_key=None for cross-partition query
        query = "SELECT c.id, c.ideaId FROM c WHERE c.type = 'idea'"
        items = container.query_items(query=query)

        deleted_count = 0
        async for item in items:
            try:
                await container.delete_item(item=item["id"], partition_key=item["ideaId"])
                deleted_count += 1
                print(f"Deleted idea {deleted_count}")
            except Exception as e:
                print(f"Error deleting item: {e}")

        print(f"\nDeleted {deleted_count} ideas")

    finally:
        await client.close()


def main():
    """
    Main entry point.
    """
    import argparse

    parser = argparse.ArgumentParser(description="Seed Ideas Hub with test data")
    parser.add_argument("--clear", action="store_true", help="Clear existing ideas before seeding")
    parser.add_argument("--clear-only", action="store_true", help="Only clear existing ideas, don't seed")
    args = parser.parse_args()

    if args.clear_only:
        print("Clearing existing ideas...")
        asyncio.run(clear_ideas())
    elif args.clear:
        print("Clearing existing ideas...")
        asyncio.run(clear_ideas())
        print("\nSeeding new ideas...")
        asyncio.run(seed_ideas())
    else:
        print("Seeding ideas (use --clear to remove existing ideas first)...")
        asyncio.run(seed_ideas())


if __name__ == "__main__":
    main()

