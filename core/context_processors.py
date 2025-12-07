from .models import Service, SiteConfiguration,SiteSettings,FooterLink,ContactInfo,CompanyPage

def global_site_data(request):
    config = SiteConfiguration.objects.first()
    
    # SYSTEM UPGRADE: Use prefetch_related to get sub_services efficiently
    # This allows us to loop through them in the HTML without extra database hits
    all_services = Service.objects.filter(is_active=True).prefetch_related('sub_services')
    settings = SiteSettings.objects.first()
    services_links = FooterLink.objects.filter(category='services')
    company_links = FooterLink.objects.filter(category='company')
    social_links = FooterLink.objects.filter(category='social')
    contacts = ContactInfo.objects.all()
    company_pages = CompanyPage.objects.filter(is_active=True)

    return {
        'config': config,
        'all_services': all_services,
        'settings': settings,
        'services_links': services_links,
        'company_links': company_links,
        'social_links': social_links,
        'contacts': contacts,
        'company_pages': company_pages,
    }