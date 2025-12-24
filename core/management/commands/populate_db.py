# core/management/commands/populate_db.py
from django.core.management.base import BaseCommand
from core.models import (
    SiteConfiguration, HeroSection, AboutUs, AboutUsSection, AboutUsPage,
    CompanyProfile, Service, SubService, TeamMemberPortfolio, ClientLogo,
    ClientTicker, TacticalAdvantage, Project, LabExperiment, BusinessTeamMember,
    Testimonial, CompanyPage, FooterLink, ContactInfo
)
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Populate the database with initial demo data'

    def handle(self, *args, **kwargs):
        self.stdout.write("Populating database...")

        # -----------------------------
        # 1. Site Configuration
        # -----------------------------
        if not SiteConfiguration.objects.exists():
            SiteConfiguration.objects.create(
                site_name="ALIENHOUSE",
                logo_highlight_text="HOUSE",
                footer_text="Galactic Rights Reserved.",
                address="Rajkot, Gujarat, India",
                email="signal@alienhouse.net",
                phone="+91 999-999-9999"
            )
            self.stdout.write("SiteConfiguration created.")

        # -----------------------------
        # 2. Hero Section
        # -----------------------------
        if not HeroSection.objects.exists():
            HeroSection.objects.create(
                status_text="SYSTEM STATUS: OPTIMAL // 2025.Q4",
                main_heading_line_1="BEYOND",
                main_heading_gradient_text="HUMANITY",
                sub_text="We engineer the post-human enterprise...",
                btn_primary_text="INITIATE PROTOCOL",
                btn_secondary_text="VIEW CAPABILITIES",
                coord_text="COORD: 23.0225° N, 72.5714° E",
                mem_text="MEM: 64TB / 128TB"
            )
            self.stdout.write("HeroSection created.")

        # -----------------------------
        # 3. About Us
        # -----------------------------
        about_us_sections = [
            {"title": "overview", "heading": "Company Overview", "content": "We are a cutting-edge tech company..."},
            {"title": "mission_vision", "heading": "Mission & Vision", "content": "To advance human-machine synergy..."},
        ]
        for section_data in about_us_sections:
            section, created = AboutUsSection.objects.get_or_create(**section_data)
            if created:
                self.stdout.write(f"AboutUsSection '{section.heading}' created.")

        if not AboutUsPage.objects.exists():
            page = AboutUsPage.objects.create(
                page_title="About AlienHouse",
                hero_heading="About AlienHouse",
                hero_subtext="We build the future."
            )
            page.sections.set(AboutUsSection.objects.all())
            page.save()
            self.stdout.write("AboutUsPage created with sections.")

        # -----------------------------
        # 4. Company Profile
        # -----------------------------
        if not CompanyProfile.objects.exists():
            CompanyProfile.objects.create(
                site_name="AlienHouse",
                tagline="Beyond Humanity",
                about="Leading innovation in AI, Robotics, and SpaceTech.",
                email="contact@alienhouse.net",
                phone="+91 999-999-8888",
                facebook="https://facebook.com/alienhouse",
                instagram="https://instagram.com/alienhouse",
                linkedin="https://linkedin.com/company/alienhouse",
                twitter="https://twitter.com/alienhouse",
                youtube="https://youtube.com/alienhouse"
            )
            self.stdout.write("CompanyProfile created.")

        # -----------------------------
        # 5. Services and SubServices
        # -----------------------------
        service_data = [
            {
                "name": "AI Solutions",
                "icon": "cpu",
                "short_description": "Cutting-edge AI systems",
                "description": "Full-stack AI services for enterprise.",
            },
            {
                "name": "Robotics",
                "icon": "robot",
                "short_description": "Autonomous machines",
                "description": "Advanced robotics for industry and research."
            }
        ]
        for s in service_data:
            service, created = Service.objects.get_or_create(name=s["name"], defaults=s)
            if created:
                self.stdout.write(f"Service '{service.name}' created.")
            
            # Add a default SubService
            if not service.sub_services.exists():
                SubService.objects.create(
                    service=service,
                    name=f"{service.name} Basic Package",
                    price_range="$500 - $1000",
                    delivery_time="2 Weeks",
                    description=f"Starter package for {service.name} services.",
                    is_popular=True
                )
                self.stdout.write(f"SubService for '{service.name}' created.")

        # -----------------------------
        # 6. Team Members
        # -----------------------------
        team_members = [
            {"name": "Dr. Jane Doe", "role": "CEO"},
            {"name": "John Smith", "role": "CTO"}
        ]
        for tm in team_members:
            member, created = TeamMemberPortfolio.objects.get_or_create(name=tm["name"], defaults=tm)
            if created:
                self.stdout.write(f"TeamMember '{member.name}' created.")

        # -----------------------------
        # 7. Clients / Logos / Tickers
        # -----------------------------
        clients = ["ACME Corp", "Globex", "Initech"]
        for c in clients:
            ClientTicker.objects.get_or_create(name=c)
            ClientLogo.objects.get_or_create(name=c)
        self.stdout.write("Clients added.")

        # -----------------------------
        # 8. Projects & Lab Experiments
        # -----------------------------
        project, _ = Project.objects.get_or_create(
            title="Interstellar AI Project",
            tech_stack="Python, TensorFlow, PyTorch",
            description="A groundbreaking AI research project."
        )
        LabExperiment.objects.get_or_create(title="Quantum Neural Nets")
        self.stdout.write("Projects and LabExperiments created.")

        # -----------------------------
        # 9. Testimonials
        # -----------------------------
        Testimonial.objects.get_or_create(
            name="Elon Musk",
            company="SpaceX",
            rating=5,
            content="AlienHouse is revolutionizing AI and robotics!"
        )
        self.stdout.write("Testimonial created.")

        # -----------------------------
        # 10. Company Pages
        # -----------------------------
        pages = [
            {"title": "Careers"},
            {"title": "Blog"},
        ]
        for p in pages:
            CompanyPage.objects.get_or_create(title=p["title"], slug=p["title"].lower())
        self.stdout.write("CompanyPages created.")

        # -----------------------------
        # 11. Footer Links
        # -----------------------------
        FooterLink.objects.get_or_create(title="Privacy Policy", category="company", url="/privacy/")
        FooterLink.objects.get_or_create(title="Terms of Service", category="company", url="/terms/")
        FooterLink.objects.get_or_create(title="GitHub", category="social", url="https://github.com/alienhouse")
        self.stdout.write("FooterLinks created.")

        # -----------------------------
        # 12. Contact Info
        # -----------------------------
        contacts = [
            {"contact_type": "email", "display_value": "contact@alienhouse.net"},
            {"contact_type": "phone", "display_value": "+91 999-999-8888"},
            {"contact_type": "twitter", "display_value": "@alienhouse", "link": "https://twitter.com/alienhouse"}
        ]
        for c in contacts:
            ContactInfo.objects.get_or_create(contact_type=c["contact_type"], display_value=c["display_value"], defaults=c)
        self.stdout.write("ContactInfo created.")

        self.stdout.write(self.style.SUCCESS("Database population complete!"))
