# your_app/management/commands/populate_db.py

from django.core.management.base import BaseCommand
from core.models import Service, SubService, ServiceModule


class Command(BaseCommand):
    help = "Populate database with dummy Services, Sub-Services and Service Modules"

    def handle(self, *args, **kwargs):

        self.stdout.write(self.style.WARNING("Populating dummy data..."))

        # ===============================
        # 1️⃣ TOP LEVEL SERVICES
        # ===============================
        services_data = [
            "Software Development",
            "Cloud Solutions",
            "Cybersecurity",
            "Digital Marketing",
            "Data Science & AI"
        ]

        service_objects = {}

        for name in services_data:
            obj, created = Service.objects.get_or_create(
                name=name,
                defaults={"description": f"Service category for {name}."}
            )
            service_objects[name] = obj
            self.stdout.write(self.style.SUCCESS(f"✓ Service: {name}"))

        # ===============================
        # 2️⃣ SUB-SERVICES FOR EACH SERVICE
        # ===============================

        sub_services_map = {
            "Software Development": [
                "Web Development",
                "Mobile App Development",
                "API Development",
                "DevOps & Cloud Engineering",
                "QA & Testing"
            ],
            "Cloud Solutions": [
                "Cloud Migration",
                "Cloud Optimization",
                "Cloud Security",
                "Serverless Development"
            ],
            "Cybersecurity": [
                "Vulnerability Assessment",
                "Penetration Testing",
                "Security Automation",
                "Network Security"
            ],
            "Digital Marketing": [
                "SEO Optimization",
                "Social Media Marketing",
                "Content Strategy",
                "Marketing Automation"
            ],
            "Data Science & AI": [
                "Machine Learning",
                "Data Engineering",
                "Business Intelligence",
                "AI Automation"
            ],
        }

        sub_service_objects = {}

        for service_name, sub_services in sub_services_map.items():
            for sub in sub_services:
                obj, created = SubService.objects.get_or_create(
                    service=service_objects[service_name],
                    name=sub,
                    defaults={"description": f"Sub-service under {service_name}."}
                )
                sub_service_objects[sub] = obj
                self.stdout.write(self.style.SUCCESS(f"   → Sub-Service: {sub}"))

        # ===============================
        # 3️⃣ SERVICE MODULES FOR EACH SUB-SERVICE
        # ===============================

        module_map = {
            "Web Development": [
                "Frontend Engineering",
                "Backend Engineering",
                "Full Stack Development",
                "CMS Development",
                "Performance Optimization"
            ],
            "Mobile App Development": [
                "Android Apps",
                "iOS Apps",
                "Flutter Cross Platform",
                "Mobile API Integration",
                "App UI/UX Design"
            ],
            "API Development": [
                "REST API Development",
                "GraphQL APIs",
                "API Security",
                "Third-Party API Integration",
                "Microservices Architecture"
            ],
            "DevOps & Cloud Engineering": [
                "CI/CD Pipeline Setup",
                "Docker & Kubernetes",
                "Infrastructure as Code",
                "Monitoring & Logging",
                "Cloud Deployment Automation"
            ],
            "QA & Testing": [
                "Manual Testing",
                "Automation Testing",
                "API Testing",
                "Load Testing",
                "Security Testing"
            ],

            "Cloud Migration": [
                "Server Migration",
                "Database Migration",
                "Legacy System Modernization",
                "Cloud Compatibility Analysis"
            ],
            "Cloud Optimization": [
                "Cost Optimization",
                "Performance Tuning",
                "Auto Scaling Setup",
                "Resource Monitoring"
            ],

            "Vulnerability Assessment": [
                "Network Scanning",
                "Application Scanning",
                "Code Vulnerability Review"
            ],
            "Penetration Testing": [
                "Web App PenTest",
                "Network PenTest",
                "API PenTest"
            ],

            "SEO Optimization": [
                "On Page SEO",
                "Off Page SEO",
                "Technical SEO",
                "Keyword Research"
            ],

            "Machine Learning": [
                "Model Development",
                "Model Training",
                "Model Optimization",
                "AI Pipeline Automation"
            ],
            "Data Engineering": [
                "Data Pipeline Setup",
                "ETL Development",
                "Database Modeling",
                "Data Quality Validation"
            ],
        }

        # Create service modules
        order_num = 1
        for sub_service_name, modules in module_map.items():
            for module in modules:
                obj, created = ServiceModule.objects.get_or_create(
                    sub_service=sub_service_objects[sub_service_name],
                    title=module,
                    defaults={
                        "description": f"Module for {sub_service_name}: {module}",
                        "icon_name": "settings",
                        "module_id": f"MOD_{order_num:03}",
                        "order": order_num,
                        "features_list": "Feature 1\nFeature 2\nFeature 3"
                    }
                )
                order_num += 1
                self.stdout.write(self.style.SUCCESS(f"       → Module: {module}"))

        self.stdout.write(self.style.SUCCESS("\n🎉 Dummy data population completed!"))
