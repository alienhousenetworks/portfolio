from django.shortcuts import render
import json
from .models import (
    SiteConfiguration, HeroSection, ServiceModule, 
    BusinessTeamMember, ClientTicker, TacticalAdvantage, 
    Project, LabExperiment, AboutUs, ClientLogo, Testimonial
)



from django.shortcuts import render, get_object_or_404
from .models import (
    HeroSection, Service, BusinessTeamMember, 
    ClientTicker, TacticalAdvantage, Project, LabExperiment
)
from .forms import ContactForm

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
    experiments = LabExperiment.objects.all()
    clients_logo = ClientLogo.objects.all()
    testimonials = Testimonial.objects.all()
    contact_form = ContactForm()

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
        "testimonials": testimonials,
        "contact_form": contact_form,
    }
    
    return render(request, 'core/index.html', context)

def indexgame(request):
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
    
    return render(request, 'core/indexgame.html', context)

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

# core/views.py
from django.shortcuts import render, get_object_or_404
from .models import AboutUsPage, SiteConfiguration

def about_us(request):
    """
    Fetch About Us page and its dynamic sections.
    """
    about_page = AboutUsPage.objects.prefetch_related('sections').first()
    sections = about_page.sections.all() if about_page else []

    site_config = SiteConfiguration.objects.first()
    team = BusinessTeamMember.objects.all()

    context = {
        "about_page": about_page,
        "sections": sections,
        "config": site_config,
        "team": team,
    }
    return render(request, "core/about_us.html", context)


from django.shortcuts import render, get_object_or_404, redirect
from .models import CompanyPage, AboutUsPage

# def company_page_detail(request, slug):
#     # Fetch the menu item
#     page = get_object_or_404(CompanyPage, slug=slug)

#     # If the page has an external URL, redirect
#     if page.url:
#         return redirect(page.url)

#     # Handle internal pages dynamically
#     # You can add more special cases if needed
#     template_name = f"company/{slug}.html"
#     context = {"page": page}

#     # Example: special handling for About Us page
#     if slug == "about-us":
#         about_page = AboutUsPage.objects.first()  # fetch AboutUs content
#         context["about_page"] = about_page

#     # Render the template if it exists, otherwise fallback to generic template
#     try:
#         return render(request, template_name, context)
#     except:
#         # Fallback to generic template with only title/content
#         return render(request, "company/generic_page.html", context)

def company_page_detail(request, slug):
    # SYSTEM UPGRADE: Use prefetch_related for a single object lookup to fetch relations in 1 query
    # instead of 3 (page + sections + ctas)
    try:
        page = CompanyPage.objects.prefetch_related('sections', 'ctas').get(slug=slug)
    except CompanyPage.DoesNotExist:
        # Check if it is a 'Service' page or 'About' page that might not be in CompanyPage model
        # For now, return 404
        from django.http import Http404
        raise Http404("Page not found")

    if page.url:
        return redirect(page.url)

    # Fetch sections and CTAs dynamically (now fetched from cache/prefetch)
    sections = page.sections.all()
    ctas = page.ctas.all()
    
    context = {
        "page": page,
        "sections": sections,
        "ctas": ctas,
        "client_logos": ClientLogo.objects.all(),  # optional
        "config": SiteConfiguration.objects.first()
    }

    # Render slug-specific template if exists, fallback to generic
    template_name = f"company/{slug}.html"
    try:
        return render(request, template_name, context)
    except:
        return render(request, "company/generic_page.html", context)


# ============================================================
# 10. CAREER VIEWS
# ============================================================

from .models import JobPost
from .forms import JobApplicationForm
from django.contrib import messages

def career_list(request):
    jobs = JobPost.objects.filter(is_active=True).order_by('-posted_at')
    config = SiteConfiguration.objects.first()
    
    context = {
        'jobs': jobs,
        'config': config,
    }
    return render(request, 'core/career.html', context)

def job_detail(request, slug):
    job = get_object_or_404(JobPost, slug=slug, is_active=True)
    config = SiteConfiguration.objects.first()
    
    if request.method == 'POST':
        form = JobApplicationForm(request.POST, request.FILES)
        if form.is_valid():
            application = form.save(commit=False)
            application.job = job
            application.save()
            messages.success(request, "Your application has been submitted successfully!")
            return redirect('job_detail', slug=slug)
        else:
            messages.error(request, "There was an error with your submission. Please check the form.")
    else:
        form = JobApplicationForm()

    context = {
        'job': job,
        'form': form,
        'config': config,
    }
    return render(request, 'core/job_detail.html', context)

from django.http import JsonResponse
from .forms import ContactForm

def contact_submit(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            form.save()
            return JsonResponse({'success': True, 'message': 'TRANSMISSION RECEIVED. WE WILL RESPOND SHORTLY.'})
        else:
            return JsonResponse({'success': False, 'errors': form.errors}, status=400)
    return JsonResponse({'success': False, 'message': 'Invalid request method.'}, status=405)
