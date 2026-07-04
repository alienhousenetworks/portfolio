from django.shortcuts import render
from django.utils.html import strip_tags

from core.models import (
    AboutUs,
    BusinessTeamMember,
    HeroSection,
    Project,
    Service,
    SiteConfiguration,
    TacticalAdvantage,
)

SOFTWARE_KEYS = ('software', 'develop', 'code', 'ai', 'web', 'app', 'cloud', 'data', 'tech', 'engineer', 'program')
MARKETING_KEYS = ('market', 'brand', 'seo', 'social', 'content', 'design', 'media', 'creative', 'advert')


def _categorize_service(service):
    text = f'{service.name} {service.slug} {service.short_description}'.lower()
    if any(k in text for k in MARKETING_KEYS):
        return 'marketing'
    if any(k in text for k in SOFTWARE_KEYS):
        return 'software'
    return 'consulting'


def _building_style(district):
    return {
        'software': 'tech',
        'marketing': 'marketing',
        'consulting': 'consulting',
    }.get(district, 'office')


def _district_subtitle(district):
    return {
        'software': 'SOFTWARE DISTRICT',
        'marketing': 'MARKETING DISTRICT',
        'consulting': 'CONSULTING OFFICE',
        'innovation': 'INNOVATION DISTRICT',
    }.get(district, 'OFFICE')


def _join_lines(*parts):
    return '\n'.join(p.strip() for p in parts if p and str(p).strip())


def _service_panel(service, site_name):
    lines = [
        service.short_description,
        '',
        service.description,
    ]
    advantages = [a for a in (service.advantage_1, service.advantage_2, service.advantage_3) if a]
    if advantages:
        lines.append('')
        lines.append('Key advantages:')
        lines.extend(f'• {a}' for a in advantages)
    if service.technical_specs:
        lines.append('')
        lines.append('Technical specs:')
        lines.append(strip_tags(service.technical_specs))
    lines.append('')
    lines.append(f'— {site_name}')
    return _join_lines(*lines)


def _project_panel(project, site_name):
    return _join_lines(
        f'Tech stack: {project.tech_stack}',
        '',
        project.description,
        '',
        f'— {site_name}',
    )


def _hq_panel(site_config, hero, about_us, tactics, site_name):
    lines = []
    if hero and hero.sub_text:
        lines.extend([hero.sub_text, ''])
    if hero:
        lines.append(f'{hero.main_heading_line_1} {hero.main_heading_gradient_text}')
        lines.append('')
    for a in about_us:
        lines.append(f'{a.heading}')
        if a.subheading:
            lines.append(a.subheading)
        lines.append('')
    if tactics:
        lines.append('Our advantages:')
        for t in tactics:
            lines.append(f'• {t.title}: {t.description}')
        lines.append('')
    if site_config:
        lines.append(f'Email: {site_config.email}')
        lines.append(f'Phone: {site_config.phone}')
        lines.append(f'Address: {site_config.address}')
    lines.append('')
    lines.append(f'— {site_name}')
    return _join_lines(*lines)


def _contact_panel(site_config, hero, site_name):
    lines = [f'Contact {site_name}', '']
    if hero and hero.sub_text:
        lines.append(hero.sub_text)
        lines.append('')
    if site_config:
        lines.extend([
            f'Email: {site_config.email}',
            f'Phone: {site_config.phone}',
            f'Address: {site_config.address}',
        ])
        if site_config.footer_text:
            lines.append('')
            lines.append(site_config.footer_text)
    return _join_lines(*lines)


def _team_panel(member, site_name):
    return _join_lines(
        f'{member.name} — {member.role}',
        '',
        f'Team member at {site_name}. Visit our HQ or service districts to learn more about what we build.',
        '',
        f'— {site_name}',
    )


def _host_line(building, site_name):
    title = building['title']
    short = building.get('shortDescription') or ''
    role = building.get('hostRole') or 'representative'
    if building['hostType'] == 'alien':
        return (
            f"Greetings! I'm {building['hostName']}, alien {role} at {title}. "
            f"Press E brought you the full briefing — here's what {site_name} offers: {short}"
        )
    return (
        f"Hi! I'm {building['hostName']}, {role} at {title}. "
        f"Let me walk you through our services — {short}"
    )


def _build_game_buildings(services, projects, team, site_name):
    buildings = []
    team_list = list(team)
    district_slots = {
        'software': [(-198, -118), (-170, -118), (-142, -118), (-198, -90), (-170, -62), (-142, -62)],
        'marketing': [(142, -118), (170, -118), (198, -118), (142, -90), (170, -62), (198, -62)],
        'consulting': [(-60, -150), (60, -150), (-60, 130), (60, 130)],
    }
    slot_idx = {'software': 0, 'marketing': 0, 'consulting': 0, 'innovation': 0}
    innovation_slots = [(-155, 145), (-130, 145), (-105, 145), (-155, 175), (-130, 175), (-105, 175)]

    for i, service in enumerate(services):
        district = _categorize_service(service)
        slots = district_slots.get(district, district_slots['consulting'])
        si = slot_idx[district] % len(slots)
        slot_idx[district] += 1
        x, z = slots[si]

        member = team_list[i % len(team_list)] if team_list else None
        host_type = 'alien' if i % 2 == 0 else 'human'
        host_name = member.name if member else ('Zara' if host_type == 'alien' else 'Alex')
        host_role = member.role if member else 'specialist'

        panel = _service_panel(service, site_name)
        b = {
            'id': f'svc-{service.slug}',
            'type': 'service',
            'district': district,
            'buildingStyle': _building_style(district),
            'x': x,
            'z': z,
            'title': service.name,
            'subtitle': _district_subtitle(district),
            'shortDescription': service.short_description,
            'description': service.description,
            'content': panel,
            'panelContent': panel,
            'icon': service.icon or 'cpu',
            'hostType': host_type,
            'hostName': host_name,
            'hostRole': host_role,
            'hostX': x + (6 if host_type == 'human' else -6),
            'hostZ': z + 14,
        }
        b['hostLine'] = _host_line(b, site_name)
        buildings.append(b)

    for i, project in enumerate(projects[:6]):
        si = slot_idx['innovation'] % len(innovation_slots)
        slot_idx['innovation'] += 1
        x, z = innovation_slots[si]
        host_type = 'human' if i % 2 else 'alien'
        host_name = team_list[(i + 1) % len(team_list)].name if team_list else ('Jordan' if host_type == 'human' else 'Kov')
        panel = _project_panel(project, site_name)

        b = {
            'id': f'proj-{i}',
            'type': 'project',
            'district': 'innovation',
            'buildingStyle': 'project',
            'x': x,
            'z': z,
            'title': project.title,
            'subtitle': 'PROJECT SHOWCASE',
            'shortDescription': project.tech_stack,
            'description': project.description,
            'content': panel,
            'panelContent': panel,
            'hostType': host_type,
            'hostName': host_name,
            'hostRole': 'project lead',
            'hostX': x + 5,
            'hostZ': z + 12,
        }
        b['hostLine'] = (
            f"I'm {host_name}, project lead. This showcase is {project.title} "
            f"— built with {project.tech_stack}. Step inside for the full case study."
        )
        buildings.append(b)

    return buildings


def world(request):
    site_config = SiteConfiguration.objects.first()
    hero = HeroSection.objects.first()
    services = Service.objects.filter(is_active=True).order_by('order')
    team = BusinessTeamMember.objects.all().order_by('order')
    about_us = AboutUs.objects.all().order_by('order')
    projects = Project.objects.all()
    tactics = TacticalAdvantage.objects.all()

    site_name = site_config.site_name if site_config else 'ALIENHOUSE'
    hq_content = _hq_panel(site_config, hero, about_us, tactics, site_name)
    contact_content = _contact_panel(site_config, hero, site_name)

    game_data = {
        'siteName': site_name,
        'email': site_config.email if site_config else 'signal@alienhouse.net',
        'phone': site_config.phone if site_config else '',
        'address': site_config.address if site_config else '',
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
                'shortDescription': s.short_description,
                'description': s.description,
                'icon': s.icon or 'cpu',
            }
            for s in services
        ],
        'team': [
            {
                'name': m.name,
                'role': m.role,
                'image': m.image.url if m.image else None,
                'panelContent': _team_panel(m, site_name),
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
        'company': {
            'hqContent': hq_content,
            'contactContent': contact_content,
        },
        'districts': [
            {'id': 'software', 'label': 'Software Dev City', 'x': -170, 'z': -90, 'color': '#4488cc'},
            {'id': 'marketing', 'label': 'Marketing District', 'x': 170, 'z': -90, 'color': '#cc6644'},
            {'id': 'innovation', 'label': 'Innovation Park', 'x': -130, 'z': 165, 'color': '#88aa44'},
            {'id': 'hq', 'label': 'HQ Tower', 'x': 0, 'z': -120, 'color': '#00cc44'},
            {'id': 'park', 'label': 'Central Park', 'x': 0, 'z': 80, 'color': '#6b8e4e'},
        ],
        'buildings': _build_game_buildings(services, projects, team, site_name),
    }

    context = {
        'config': site_config,
        'game_data': game_data,
    }
    return render(request, 'game/world.html', context)