from django.contrib import admin
from django.utils.html import format_html
from django.db import models
from .models import (
    SiteConfiguration, HeroSection, CompanyProfile, 
    ServiceModule, TeamMemberPortfolio, ClientTicker, TacticalAdvantage,
    Project, LabExperiment,
    Service, SubService, BusinessTeamMember, Testimonial,
    Location, ContactMessage, ContactInfo,
    ClientLogo, AboutUs,
    CompanyPage, PageSection, CTA,
    AboutUsPage, AboutUsSection,
    JobPost, JobApplication
)

# ============================================================
# ADMIN INTERFACE CUSTOMIZATION
# ============================================================
admin.site.site_header = "AlienHouse Control Deck"
admin.site.site_title = "AH Admin"
admin.site.index_title = "Mission Control"

# ============================================================
# MIXINS & HELPERS
# ============================================================
class ImagePreviewMixin:
    def image_preview(self, obj):
        if hasattr(obj, 'image') and obj.image:
            return format_html('<img src="{}" width="60" style="object-fit:cover; border-radius: 4px;" />', obj.image.url)
        elif hasattr(obj, 'logo') and obj.logo:
            return format_html('<img src="{}" width="60" style="object-fit:cover; border-radius: 4px;" />', obj.logo.url)
        return "-"
    image_preview.short_description = "Preview"

# ============================================================
# INLINES
# ============================================================

class SubServiceInline(admin.StackedInline):
    model = SubService
    extra = 0
    show_change_link = True
    classes = ['collapse']
    fields = (('name', 'slug'), ('price_range', 'delivery_time'), 'description', ('is_popular', 'is_active'))
    prepopulated_fields = {"slug": ("name",)}
    description = "Manage sub-services offered under this main service."

class PageSectionInline(admin.StackedInline):
    model = PageSection
    extra = 0
    classes = ['collapse']
    fields = ('heading', 'image', 'content', 'order')
    ordering = ('order',)

class CTAInline(admin.TabularInline):
    model = CTA
    extra = 0
    fields = ('label', 'url', 'primary', 'order')
    ordering = ('order',)
    verbose_name_plural = "Call to Action Buttons (Impacts: Company Page Header)"
    description = "These buttons appear in the hero/header section of this Company Page."

class AboutUsSectionInline(admin.TabularInline):
    model = AboutUsPage.sections.through
    extra = 1
    verbose_name = "Connected Section"
    verbose_name_plural = "Connected Sections (Impacts: About Us Page Body)"
    description = "These sections will be displayed on the About Us page."


# ============================================================
# 1. GLOBAL CONFIGURATION & LANDING PAGE
# ============================================================

@admin.register(SiteConfiguration)
class SiteConfigurationAdmin(admin.ModelAdmin):
    list_display = ('site_name', 'email', 'phone')
    
    fieldsets = (
        ("Branding & Identity", {
            'fields': ('site_name', 'logo', 'logo_highlight_text', 'footer_text'),
            'description': "<strong>Impacts:</strong> Global settings. 'Site Name' appears in the browser tab. 'Logo' is in the top header. 'Footer Text' is at the bottom of every page."
        }),
        ("Contact Information", {
            'fields': ('address', 'email', 'phone'),
            'description': "<strong>Impacts:</strong> These details appear in the footer and on the Contact section/page."
        }),
    )
    
    def has_add_permission(self, request):
        # Allow only one instance
        return not SiteConfiguration.objects.exists() and super().has_add_permission(request)

@admin.register(HeroSection)
class HeroSectionAdmin(admin.ModelAdmin):
    list_display = ('main_heading_line_1', 'status_text')
    
    fieldsets = (
        ("Main Headlines", {
            'fields': ('status_text', 'main_heading_line_1', 'main_heading_gradient_text', 'sub_text'),
            'description': "<strong>Impacts:</strong> The content above the fold on the Home Page. 'Main Heading' is the big impact text."
        }),
        ("Action Buttons", {
            'fields': ('btn_primary_text', 'btn_secondary_text'),
            'description': "<strong>Impacts:</strong> The two main buttons on the Home Page hero section."
        }),
        ("Visual Decorations", {
            'classes': ('collapse',),
            'fields': ('coord_text', 'mem_text'),
            'description': "<strong>Impacts:</strong> Small, aesthetic tech-text overlaying the hero image for the 'Cyber' look."
        }),
    )

    def has_add_permission(self, request):
        return not HeroSection.objects.exists() and super().has_add_permission(request)

@admin.register(ClientTicker)
class ClientTickerAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    fieldsets = (
        (None, {
            'fields': ('name',),
            'description': "<strong>Impacts:</strong> The scrolling text marquee (running line) on the Home Page."
        }),
    )

@admin.register(ClientLogo)
class ClientLogoAdmin(admin.ModelAdmin, ImagePreviewMixin):
    list_display = ("preview", "name", "order")
    list_editable = ("order",)
    search_fields = ("name",)
    ordering = ("order",)

    def preview(self, obj):
        return self.image_preview(obj)

    fieldsets = (
        (None, {
            'fields': ('name', 'logo', 'order'),
            'description': "<strong>Impacts:</strong> The grid or marquee of Client Logos displayed on the Home Page or Company Pages."
        }),
    )


# ============================================================
# 2. COMPANY PROFILE & INFO
# ============================================================

@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    list_display = ('site_name', 'email', 'phone')
    
    fieldsets = (
        ("Company Essentials", {
            'fields': ('site_name', 'tagline', 'about'),
            'description': "<strong>Impacts:</strong> [Legacy/Backup] Core company info. Primary settings are now in 'Site Configuration'."
        }),
        ("Brand Assets", {
             'fields': ('logo', 'favicon'),
             'description': "<strong>Impacts:</strong> [Legacy] Upload logos here if not using Site Configuration."
        }),
        ("Contact Channels", {
            'fields': (('email', 'phone'), 'whatsapp'),
            'description': "<strong>Impacts:</strong> Public contact methods."
        }),
        ("Social Media", {
            'classes': ('collapse',),
            'fields': ('facebook', 'instagram', 'linkedin', 'twitter', 'youtube'),
            'description': "<strong>Impacts:</strong> Links to social media profiles in the Footer."
        }),
    )

    def has_add_permission(self, request):
        return not CompanyProfile.objects.exists() and super().has_add_permission(request)

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'is_active', 'map_link')
    search_fields = ('name', 'address')
    list_filter = ('is_active',)
    readonly_fields = ('latitude', 'longitude', 'slug', 'map_link')
    
    fieldsets = (
        ("Location Details", {
            'fields': ('name', 'address', 'is_active')
        }),
        ("Auto-Generated Geography", {
            'description': "These coordinates are automatically calculated from the address.",
            'fields': (('latitude', 'longitude'), 'map_link')
        }),
        ("Advanced", {
             'classes': ('collapse',),
             'fields': ('slug',),
        }),
    )

    def map_link(self, obj):
        if obj.latitude and obj.longitude:
            url = f"https://www.google.com/maps/search/?api=1&query={obj.latitude},{obj.longitude}"
            return format_html('<a href="{}" target="_blank">View on Google Maps</a>', url)
        return "N/A"

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_at', 'location')
    readonly_fields = ('name', 'email', 'phone', 'message', 'user_lat', 'user_lon', 'distance_km', 'location', 'created_at')
    list_filter = ('location', 'created_at')
    search_fields = ('name', 'email', 'message')
    
    fieldsets = (
        ("Sender Info", {
            'fields': ('name', 'email', 'phone', 'created_at')
        }),
        ("Message", {
            'fields': ('message',)
        }),
        ("Geo-Location Data", {
            'fields': ('location', 'distance_km', 'user_lat', 'user_lon'),
            'description': "User location data at time of submission."
        }),
    )
    
    def has_add_permission(self, request):
        return False


# ============================================================
# 3. SERVICES & PRODUCTS
# ============================================================

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin, ImagePreviewMixin):
    list_display = ('name', 'order', 'is_active', 'image_preview')
    list_editable = ('order', 'is_active')
    search_fields = ('name', 'short_description')
    prepopulated_fields = {"slug": ("name",)}
    inlines = [SubServiceInline]
    
    fieldsets = (
        ("Identification", {
            'fields': ('name', 'slug', 'is_active', 'order'),
            'description': "<strong>Impacts:</strong> Appears in the Main Navigation Menu and the Services Grid on the Home Page."
        }),
        ("Visuals", {
            'fields': ('icon', 'service_image', 'hero_image', 'service_video'),
            'description': "<strong>Impacts:</strong> 'Icon' for the home grid. 'Service Image' for the card. 'Hero Image/Video' for the specific Service Detail Page header."
        }),
        ("Content", {
            'fields': ('short_description', 'description', 'technical_specs'),
            'description': "<strong>Impacts:</strong> 'Short' is for the card. 'Description' is the main body text of the Service Detail Page."
        }),
        ("Key Advantages", {
            'fields': ('advantage_1', 'advantage_2', 'advantage_3'),
            'description': "<strong>Impacts:</strong> Bullet points highlighted on the Service Detail Page."
        }),
    )

@admin.register(SubService)
class SubServiceAdmin(admin.ModelAdmin, ImagePreviewMixin):
    list_display = ("name", "service", "price_range", "is_popular", "is_active")
    list_filter = ("service", "is_popular", "is_active")
    search_fields = ("name", "service__name", "description")
    prepopulated_fields = {"slug": ("name",)}
    
    fieldsets = (
        ("Basic Info", {
            'fields': ('service', 'name', 'slug', 'is_active'),
            'description': "<strong>Impacts:</strong> A specific pricing tier or package displayed on the Service Detail Page."
        }),
        ("Offering Details", {
            'fields': ('image', 'price_range', 'delivery_time', 'is_popular'),
            'description': "<strong>Impacts:</strong> Pricing card details. Check 'is_popular' to highlight this tier."
        }),
        ("Description", {
            'fields': ('description',),
            'description': "<strong>Impacts:</strong> The body text inside the pricing/sub-service card."
        }),
    )

@admin.register(ServiceModule)
class ServiceModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'module_id', 'sub_service', 'order')
    list_filter = ('sub_service',)
    list_editable = ('order',)
    search_fields = ('title', 'description')
    
    fieldsets = (
        ("Module Info", {
            'fields': ('title', 'module_id', 'sub_service', 'order'),
            'description': "<strong>Impacts:</strong> Smaller feature blocks or 'modules' listed inside a Sub-Service section."
        }),
        ("Content", {
            'fields': ('icon_name', 'description', 'features_list'),
             'description': "<strong>Impacts:</strong> Details of the module. 'Features List' adds bullet points."
        })
    )


# ============================================================
# 4. PORTFOLIO, LABS & PROJECTS
# ============================================================

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'tech_stack', 'color_class')
    search_fields = ('title', 'tech_stack')
    
    fieldsets = (
        (None, {
            'fields': ('title', 'image', 'description'),
            'description': "<strong>Impacts:</strong> The 'Selected Works' or 'Projects' section on the Home Page."
        }),
        ("Tech Details", {
            'fields': ('tech_stack', 'color_class'),
            'description': "<strong>Impacts:</strong> Tags showing what tech was used (e.g. 'React, Python')."
        })
    )

@admin.register(LabExperiment)
class LabExperimentAdmin(admin.ModelAdmin):
    list_display = ('title', 'progress_percent', 'color_class')
    list_filter = ('color_class',)
    
    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'progress_percent'),
            'description': "<strong>Impacts:</strong> The 'Alien Labs' / R&D section on the Home Page."
        }),
        ("Styling", {
            'fields': ('icon_name', 'color_class'),
            'description': "<strong>Impacts:</strong> Visual icon and color theme for this experiment card."
        })
    )

@admin.register(TacticalAdvantage)
class TacticalAdvantageAdmin(admin.ModelAdmin):
    list_display = ('title', 'icon_name')
    
    fieldsets = (
        (None, {
            'fields': ('title', 'description'),
             'description': "<strong>Impacts:</strong> The 'Tactical Advantages' / Features grid on the Home Page."
        }),
        ("Icon", {
            'fields': ('icon_name',),
            'description': "<strong>Impacts:</strong> The Lucide icon displayed above the title."
        })
    )


# ============================================================
# 5. TEAM & TESTIMONIALS
# ============================================================

@admin.register(TeamMemberPortfolio)
class TeamMemberPortfolioAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'skill_percent', 'order')
    list_editable = ('order',)
    
    fieldsets = (
        ("Personal Info", {
            'fields': ('name', 'role', 'job_title', 'image', 'order'),
            'description': "<strong>Impacts:</strong> The 'Meet The Team' section on the Home Page."
        }),
        ("Skills & Styling", {
            'fields': ('skill_name', 'skill_percent', 'color_class', 'border_color_class'),
            'description': "<strong>Impacts:</strong> The skill bar visualization next to the team member's photo."
        })
    )

@admin.register(BusinessTeamMember)
class BusinessTeamMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'order')
    list_editable = ('order',)
    
    fieldsets = (
        (None, {
            'fields': ('name', 'role', 'image', 'order'),
            'description': "<strong>Impacts:</strong> [Alternate Team Model] Displayed in business-focused layouts."
        }),
        ("Social Links", {
            'fields': ('linkedin', 'instagram')
        })
    )

@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'rating')
    list_filter = ('rating',)
    search_fields = ('name', 'company', 'content')
    fieldsets = (
        (None, {
            'fields': ('name', 'company', 'rating', 'content'),
            'description': "<strong>Impacts:</strong> The 'Testimonials' carousel/grid on the Home Page."
        }),
    )


# ============================================================
# 6. PAGES & CONTENT
# ============================================================

@admin.register(CompanyPage)
class CompanyPageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'is_active', 'order')
    list_editable = ('order', 'is_active')
    prepopulated_fields = {"slug": ("title",)}
    inlines = [PageSectionInline, CTAInline]
    
    fieldsets = (
        ("Page Settings", {
            'fields': ('title', 'slug', 'url', 'is_active', 'order'),
            'description': "Manages dynamic pages like 'Legal', 'Careers', etc. <strong>Impacts:</strong> Creates a new page at /company/slug/."
        }),
    )

@admin.register(AboutUsPage)
class AboutUsPageAdmin(admin.ModelAdmin):
    list_display = ("page_title", "hero_heading")
    inlines = [AboutUsSectionInline]
    
    fieldsets = (
        ("Hero Banner", {
            'fields': ('page_title', 'hero_heading', 'hero_subtext', 'hero_image'),
            'description': "<strong>Impacts:</strong> The main standalone 'About Us' page at /about-us/. This section controls the top banner."
        }),
    )

@admin.register(AboutUsSection)
class AboutUsSectionAdmin(admin.ModelAdmin):
    list_display = ("title", "heading", "order")
    list_filter = ("title",)
    list_editable = ("order",)
    
    fieldsets = (
        (None, {
            'fields': ('title', 'heading', 'image', 'order'),
            'description': "<strong>Impacts:</strong> Individual blocks of content displayed on the 'About Us' page."
        }),
        ("Content", {
            'fields': ('content',)
        })
    )

@admin.register(AboutUs)
class AboutUsAdmin(admin.ModelAdmin):
    list_display = ("heading", "order")
    list_editable = ("order",)
    fieldsets = (
        (None, {
            'fields': ('heading', 'subheading', 'image', 'order'),
             'description': "<strong>Impacts:</strong> The 'About Us' summary section on the Home Page."
        }),
    )
    
@admin.register(ContactInfo)
class ContactInfoAdmin(admin.ModelAdmin):
    list_display = ('contact_type', 'display_value', 'order')
    list_editable = ('order',)
    list_filter = ('contact_type',)
    
    fieldsets = (
        (None, {
            'fields': ('contact_type', 'display_value', 'link', 'order'),
             'description': "<strong>Impacts:</strong> List of contact details appearing on the Contact Page."
        }),
    )

# Register standalone if needed, though they are inlines usually
@admin.register(PageSection)
class PageSectionAdmin(admin.ModelAdmin):
    list_display = ('page', 'heading', 'order')
    list_filter = ('page',)
    search_fields = ('heading',)

@admin.register(CTA)
class CTAAdmin(admin.ModelAdmin):
    list_display = ('page', 'label', 'primary')
    list_filter = ('page', 'primary')
    fieldsets = (
        (None, {
             'fields': ('page', 'label', 'url', 'primary', 'order'),
             'description': "<strong>Impacts:</strong> These are action buttons displayed on specific Company Pages."
        }),
    )
# ============================================================
# 9. JOB BOARD ADMIN
# ============================================================

import csv
from django.http import HttpResponse

@admin.register(JobPost)
class JobPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'location', 'job_type', 'posted_at', 'is_active')
    list_filter = ('job_type', 'is_active', 'location')
    search_fields = ('title', 'description', 'location')
    prepopulated_fields = {'slug': ('title',)}
    list_editable = ('is_active',)

    fieldsets = (
        ("Job Details", {
            'fields': ('title', 'slug', 'location', 'job_type', 'salary_range', 'is_active'),
            'description': "Basic info about the opening."
        }),
        ("Application Setup", {
            'fields': ('external_apply_url',),
            'description': "Leave empty to use the built-in application form. Fill this to redirect users (e.g., to Google Forms)."
        }),
        ("Description", {
            'fields': ('description',),
            'description': "Full job description."
        }),
    )

@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'job', 'email', 'phone', 'applied_at', 'download_resume')
    list_filter = ('job', 'applied_at')
    search_fields = ('full_name', 'email', 'phone', 'job__title')
    readonly_fields = ('applied_at',)
    actions = ["export_as_csv"]

    def download_resume(self, obj):
        if obj.resume:
            return format_html('<a href="{}" download>Download Resume</a>', obj.resume.url)
        return "No Resume"
    download_resume.short_description = "Resume"

    def export_as_csv(self, request, queryset):
        meta = self.model._meta
        field_names = [field.name for field in meta.fields]

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename={}.csv'.format(meta)
        writer = csv.writer(response)

        writer.writerow(field_names)
        for obj in queryset:
            row = writer.writerow([getattr(obj, field) for field in field_names])

        return response

    export_as_csv.short_description = "Export selected applications to CSV"
