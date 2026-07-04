from django.shortcuts import render

from core.models import (
    AboutUs,
    BusinessTeamMember,
    HeroSection,
    Project,
    Service,
    SiteConfiguration,
    TacticalAdvantage,
)


def world(request):
    site_config = SiteConfiguration.objects.first()
    hero = HeroSection.objects.first()
    services = Service.objects.filter(is_active=True).order_by('order')
    team = BusinessTeamMember.objects.all().order_by('order')
    about_us = AboutUs.objects.all().order_by('order')
    projects = Project.objects.all()
    tactics = TacticalAdvantage.objects.all()

    game_data = {
        'siteName': site_config.site_name if site_config else 'ALIENHOUSE',
        'email': site_config.email if site_config else 'signal@alienhouse.net',
        'hero': {
            'status': hero.status_text if hero else 'Welcome to AlienHouse Networks',
            'heading': hero.main_heading_line_1 if hero else 'FUTURE',
            'gradient': hero.main_heading_gradient_text if hero else 'ENGINEERED',
            'subtext': hero.sub_text if hero else 'Advanced AI & Software Consultancy',
        },
        'about': [
            {'heading': a.heading, 'subheading': a.subheading}
            for a in about_us
        ],
        'services': [
            {
                'name': s.name,
                'slug': s.slug,
                'description': s.short_description,
                'icon': s.icon or 'cpu',
            }
            for s in services
        ],
        'team': [
            {
                'name': m.name,
                'role': m.role,
                'image': m.image.url if m.image else None,
            }
            for m in team
        ],
        'projects': [
            {
                'title': p.title,
                'tech': p.tech_stack,
                'description': p.description,
            }
            for p in projects
        ],
        'tactics': [
            {'title': t.title, 'description': t.description}
            for t in tactics
        ],
    }

    context = {
        'config': site_config,
        'game_data': game_data,
    }
    return render(request, 'game/world.html', context)