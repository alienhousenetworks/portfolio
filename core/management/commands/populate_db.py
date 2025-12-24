from django.core.management.base import BaseCommand
from core.models import (
    SiteConfiguration, HeroSection, AboutUs, ClientLogo,
    CompanyProfile, Service, SubService, ServiceModule,
    TeamMemberPortfolio, ClientTicker, TacticalAdvantage,
    Project, LabExperiment, BusinessTeamMember, Testimonial,
    Location, CompanyPage, AboutUsSection, AboutUsPage,
    SiteSettings, FooterLink, ContactInfo
)

class Command(BaseCommand):
    help = "Populate initial database data for AlienHouse Networks"

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Populating database..."))

        self.create_site_config()
        self.create_hero()
        self.create_about_home()
        self.create_company_profile()
        self.create_services()
        self.create_modules()
        self.create_team()
        self.create_advantages()
        self.create_projects()
        self.create_lab()
        self.create_testimonials()
        self.create_locations()
        self.create_pages()
        self.create_about_page()
        self.create_footer()

        self.stdout.write(self.style.SUCCESS("Database populated successfully."))

    # --------------------------------------------------
    def create_site_config(self):
        SiteConfiguration.objects.get_or_create(
            site_name="ALIENHOUSE",
            defaults={
                "logo_highlight_text": "HOUSE",
                "address": "Rajkot, Gujarat, India",
                "email": "signal@alienhouse.net",
                "phone": "+91 999-999-9999",
                "footer_text": "Galactic Rights Reserved."
            }
        )

    def create_hero(self):
        if not HeroSection.objects.exists():
            HeroSection.objects.create()

    # --------------------------------------------------
    def create_about_home(self):
        data = [
            ("Who We Are", "A post-human engineering collective."),
            ("What We Build", "AI-first enterprise systems."),
            ("Why AlienHouse", "Precision, autonomy, and scale."),
        ]
        for i, (h, s) in enumerate(data):
            AboutUs.objects.get_or_create(
                heading=h,
                defaults={"subheading": s, "order": i}
            )

    # --------------------------------------------------
    def create_company_profile(self):
        CompanyProfile.objects.get_or_create(
            site_name="AlienHouse Networks",
            defaults={
                "tagline": "Engineering the Post-Human Enterprise",
                "about": "AlienHouse builds AI-native business systems."
            }
        )

    # --------------------------------------------------
    def create_services(self):
        services = [
            ("AI Engineering", "Neural systems & automation"),
            ("Cyber Security", "Zero-trust architectures"),
            ("Cloud Systems", "Scalable distributed infra"),
        ]
        for name, desc in services:
            service, _ = Service.objects.get_or_create(
                name=name,
                defaults={
                    "short_description": desc,
                    "description": desc,
                }
            )

            SubService.objects.get_or_create(
                name=f"{name} Consulting",
                service=service,
                defaults={
                    "price_range": "$1000+",
                    "delivery_time": "2–4 Weeks",
                    "description": f"{name} advisory services",
                    "is_popular": True
                }
            )

    # --------------------------------------------------
    def create_modules(self):
        for sub in SubService.objects.all():
            ServiceModule.objects.get_or_create(
                title=f"{sub.name} Module",
                sub_service=sub,
                defaults={
                    "icon_name": "cpu",
                    "description": "Core execution module",
                    "features_list": "Design\nBuild\nDeploy",
                    "order": 1
                }
            )

    # --------------------------------------------------
    def create_team(self):
        members = [
            ("Sayantan De", "Founder"),
            ("AI Core", "Autonomous Systems"),
        ]
        for i, (n, r) in enumerate(members):
            BusinessTeamMember.objects.get_or_create(
                name=n,
                defaults={"role": r, "order": i}
            )

    # --------------------------------------------------
    def create_advantages(self):
        advantages = [
            ("zap", "Speed", "Rapid autonomous execution"),
            ("shield", "Security", "Zero trust systems"),
        ]
        for icon, title, desc in advantages:
            TacticalAdvantage.objects.get_or_create(
                title=title,
                defaults={"icon_name": icon, "description": desc}
            )

    # --------------------------------------------------
    def create_projects(self):
        Project.objects.get_or_create(
            title="AlienAI Core",
            defaults={
                "tech_stack": "Python, Torch, Kubernetes",
                "description": "Autonomous AI engine",
            }
        )

    # --------------------------------------------------
    def create_lab(self):
        LabExperiment.objects.get_or_create(
            title="AGI Simulation",
            defaults={
                "description": "Experimental cognition stack",
                "progress_percent": 42
            }
        )

    # --------------------------------------------------
    def create_testimonials(self):
        Testimonial.objects.get_or_create(
            name="Enterprise Client",
            defaults={
                "content": "AlienHouse rebuilt our systems.",
                "rating": 5,
                "company": "Stealth Corp"
            }
        )

    # --------------------------------------------------
    def create_locations(self):
        Location.objects.get_or_create(
            name="Rajkot HQ",
            defaults={"address": "Rajkot, Gujarat, India"}
        )

    # --------------------------------------------------
    def create_pages(self):
        pages = ["About Us", "Careers", "Blog"]
        for i, p in enumerate(pages):
            CompanyPage.objects.get_or_create(
                title=p,
                defaults={"slug": p.lower().replace(" ", "-"), "order": i}
            )

    # --------------------------------------------------
    def create_about_page(self):
        page, _ = AboutUsPage.objects.get_or_create(
            page_title="About Us",
            defaults={"hero_heading": "About AlienHouse"}
        )

        sections = [
            ("overview", "Company Overview", "We build post-human systems."),
            ("mission_vision", "Mission & Vision", "Beyond humanity."),
            ("why_choose_us", "Why Choose Us", "Precision execution."),
        ]

        for i, (t, h, c) in enumerate(sections):
            sec, _ = AboutUsSection.objects.get_or_create(
                title=t,
                heading=h,
                defaults={"content": c, "order": i}
            )
            page.sections.add(sec)

    # --------------------------------------------------
    def create_footer(self):
        SiteSettings.objects.get_or_create(site_name="AlienHouse")

        FooterLink.objects.get_or_create(
            title="LinkedIn",
            category="social",
            defaults={"url": "https://linkedin.com"}
        )

        ContactInfo.objects.get_or_create(
            contact_type="email",
            display_value="signal@alienhouse.net"
        )
