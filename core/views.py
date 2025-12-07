from django.shortcuts import render
import json
from .models import (
    SiteConfiguration, HeroSection, ServiceModule, 
    BusinessTeamMember, ClientTicker, TacticalAdvantage, 
    Project, LabExperiment, AboutUs , ClientLogo
)

# def index(request):
#     # Get Singletons (use .first() to get the one and only instance)
#     site_config = SiteConfiguration.objects.first()
#     hero = HeroSection.objects.first()
    
#     # Get Lists
#     services = ServiceModule.objects.all()
  
#     team = BusinessTeamMember.objects.all()
#     ticker_items = ClientTicker.objects.all()
#     tactics = TacticalAdvantage.objects.all()
#     projects = Project.objects.all()
#     experiments = LabExperiment.objects.all()

#     context = {
#         'config': site_config,
#         'hero': hero,
#         'services': services,
#         'team': team,
#         'ticker_items': ticker_items,
#         'tactics': tactics,
#         'projects': projects,
#         'experiments': experiments,
#     }
    
#     return render(request, 'core/index.html', context)

from django.shortcuts import render, get_object_or_404
from .models import (
    HeroSection, Service, BusinessTeamMember, 
    ClientTicker, TacticalAdvantage, Project, LabExperiment
)

def index(request):
    # Note: 'config' and 'all_services' are now handled by the context processor!
    # You only need to fetch data specific to the BODY of the index page.
    about_us = AboutUs.objects.all()
    site_config = SiteConfiguration.objects.first()
    services = Service.objects.filter(is_active=True).prefetch_related('sub_services')
    hero = HeroSection.objects.first()
    team = BusinessTeamMember.objects.all()
    ticker_items = ClientTicker.objects.all()
    tactics = TacticalAdvantage.objects.all()
    projects = Project.objects.all()
    experiments = LabExperiment.objects.all()
    clients_logo = ClientLogo.objects.all()

    context = {
        'hero': hero,
        'team': team,
        'ticker_items': ticker_items,
        'tactics': tactics,
        'projects': projects,
        'experiments': experiments,
        'config': site_config,
        'services': services,
        "about_us" : about_us,
        "client_logos" : clients_logo,

    }
    
    return render(request, 'core/index.html', context)



from django.shortcuts import render, get_object_or_404
from .models import Service, SiteConfiguration

# 1. The Dynamic Service Page
def service_detail(request, slug):
    # Fetch the specific service by the slug in the URL
    service = get_object_or_404(Service, slug=slug, is_active=True)
    
    # Fetch related config (for header/footer)
    config = SiteConfiguration.objects.first()
    
    # Get all services for the navigation menu
    all_services = Service.objects.filter(is_active=True)

    context = {
        'service': service,
        'sub_services': service.sub_services.filter(is_active=True),
        'config': config,
        'all_services': all_services, # Required for the navbar dropdown
    }
    return render(request, 'core/service_detail.html', context)

# from django.shortcuts import render
# from .models import (
#     SiteConfiguration, HeroSection, Service, SubService,
#     BusinessTeamMember, Project, CompanyProfile
# )

# def index(request):
#     # 1. Fetch Global Config
#     site_config = SiteConfiguration.objects.first()
#     hero = HeroSection.objects.first()
#     company_profile = CompanyProfile.objects.first()

#     # 2. CONSTRUCT 3D WORLD DATA (The "Planets")
#     # We build a list of dictionaries that mirrors the JS 'ADMIN_DB' structure
    
#     universe_data = []

#     # --- PLANET 1: SERVICES & SUB-SERVICES ---
#     services_queryset = Service.objects.prefetch_related('sub_services').filter(is_active=True)
#     service_list = []
    
#     for service in services_queryset:
#         # Format: "Web Dev: React, Django, AWS"
#         subs = [sub.name for sub in service.sub_services.filter(is_active=True)]
#         sub_str = ", ".join(subs) if subs else "Core Systems"
#         service_list.append(f"[{service.name}] {sub_str}")

#     universe_data.append({
#         'id': 'ALPHA',
#         'title': 'SERVICES',
#         'type': 'CITY',
#         'desc': 'Core computational offerings and sub-routines.',
#         'data': service_list if service_list else ["No Active Services"]
#     })

#     # --- PLANET 2: PROJECTS ---
#     projects = Project.objects.all()[:5] # Limit to 5 for UI clarity
#     project_list = [f"{p.title} // {p.tech_stack}" for p in projects]
    
#     universe_data.append({
#         'id': 'BETA',
#         'title': 'PROJECTS',
#         'type': 'GALLERY',
#         'desc': 'Deployed hyper-structures and experiments.',
#         'data': project_list if project_list else ["Classified"]
#     })

#     # --- PLANET 3: TEAM ---
#     team = BusinessTeamMember.objects.order_by('order')
#     team_list = [f"{t.name} :: {t.role}" for t in team]

#     universe_data.append({
#         'id': 'GAMMA',
#         'title': 'OPERATIVES',
#         'type': 'AVATAR',
#         'desc': 'The architects of the simulation.',
#         'data': team_list if team_list else ["AI Automated"]
#     })

#     # --- PLANET 4: CONNECTIONS (Company Profile) ---
#     connections_list = []
#     if company_profile:
#         if company_profile.email: connections_list.append(f"EMAIL :: {company_profile.email}")
#         if company_profile.phone: connections_list.append(f"COMMS :: {company_profile.phone}")
#         if company_profile.linkedin: connections_list.append(f"LINKEDIN :: Active")
#         if company_profile.instagram: connections_list.append(f"INSTAGRAM :: Active")
#         if company_profile.whatsapp: connections_list.append(f"WHATSAPP :: Encrypted")
    
#     universe_data.append({
#         'id': 'NEXUS',
#         'title': 'CONNECTIONS',
#         'type': 'TERMINAL',
#         'desc': 'Establish secure communication protocols.',
#         'data': connections_list if connections_list else ["Signal Lost"]
#     })

#     context = {
#         'config': site_config,
#         'hero': hero,
#         # Serialize the universe data to JSON for the template
#         'universe_data_json': json.dumps(universe_data),
#     }
    
#     return render(request, 'core/index.html', context)


