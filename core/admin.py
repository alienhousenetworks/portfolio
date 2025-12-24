# admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    # Base/Configuration
    SiteConfiguration, HeroSection, CompanyProfile,
    # Landing Page Components
    ServiceModule, TeamMemberPortfolio, ClientTicker, TacticalAdvantage,
    Project, LabExperiment,
    # Business Logic
    Service, SubService, BusinessTeamMember, Testimonial,
    # Geo/Contact
    Location, ContactMessage
)

# ============================================================
# INLINES
# ============================================================

class SubServiceInline(admin.StackedInline):
    model = SubService
    extra = 1
    fields = ('name', 'slug', 'image', 'price_range', 'delivery_time', 'description', 'is_popular', 'is_active')
    prepopulated_fields = {"slug": ("name",)}


# ============================================================
# 1. CONFIGURATION & LANDING PAGE SECTIONS
# ============================================================

@admin.register(SiteConfiguration)
class SiteConfigurationAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not SiteConfiguration.objects.exists() and super().has_add_permission(request)
    
    list_display = ('site_name', 'email', 'phone')
    fieldsets = (
        ("Branding & Identity", {
            'fields': ('site_name', 'logo_highlight_text', 'footer_text')
        }),
        ("Contact Information", {
            'fields': ('address', 'email', 'phone')
        }),
    )


@admin.register(HeroSection)
class HeroSectionAdmin(admin.ModelAdmin):
    list_display = ('status_text', 'main_heading_line_1', 'coord_text')
    def has_add_permission(self, request):
        return not HeroSection.objects.exists() and super().has_add_permission(request)


@admin.register(ServiceModule)
class ServiceModuleAdmin(admin.ModelAdmin):
    list_display = ('title', 'module_id', 'icon_name', 'order')
    list_editable = ('order',)
    search_fields = ('title', 'description')


@admin.register(TeamMemberPortfolio)
class TeamMemberPortfolioAdmin(admin.ModelAdmin):
    list_display = ('name', 'job_title', 'skill_percent', 'order', 'color_class')
    list_editable = ('order',)
    search_fields = ('name', 'job_title', 'skill_name')


@admin.register(ClientTicker)
class ClientTickerAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(TacticalAdvantage)
class TacticalAdvantageAdmin(admin.ModelAdmin):
    list_display = ('title', 'icon_name')
    search_fields = ('title', 'description')


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'tech_stack', 'color_class')
    search_fields = ('title', 'tech_stack')


@admin.register(LabExperiment)
class LabExperimentAdmin(admin.ModelAdmin):
    list_display = ('title', 'progress_percent', 'icon_name', 'color_class')
    list_filter = ('color_class',)


# ============================================================
# 2. COMPANY PROFILE
# ============================================================

@admin.register(CompanyProfile)
class CompanyProfileAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return not CompanyProfile.objects.exists() and super().has_add_permission(request)

    list_display = ('site_name', 'tagline', 'email', 'phone')
    fieldsets = (
        ("Basic Info", {
            'fields': ('site_name', 'tagline', 'about')
        }),
        ("Branding", {
            'fields': ('logo', 'favicon')
        }),
        ("Contact Details", {
            'fields': ('email', 'phone', 'whatsapp')
        }),
        ("Social Media Links", {
            'fields': ('facebook', 'instagram', 'linkedin', 'twitter', 'youtube')
        }),
    )


# ============================================================
# 3. SERVICES
# ============================================================

@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "icon", "is_active")
    search_fields = ("name", "short_description", "description")
    
    fields = (
        "name", "slug", "icon",
        "service_image", "hero_image",
        "short_description", "description",
        "technical_specs",
        "advantage_1", "advantage_2", "advantage_3",
        "is_active"
    )

    readonly_fields = ("slug",)

    prepopulated_fields = {"slug": ("name",)}




@admin.register(SubService)
class SubServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "service", "image_preview", "price_range", "delivery_time", "is_popular", "is_active")
    list_filter = ("service", "is_popular", "is_active")
    search_fields = ("name", "service__name", "description")

    fields = (
        "service", "name", "slug",
        "image", "price_range", "delivery_time",
        "description", "is_popular", "is_active"
    )

    readonly_fields = ("image_preview",)

    prepopulated_fields = {"slug": ("name",)}

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="80" />', obj.image.url)
        return "No Image"
    image_preview.short_description = "Preview"



# @admin.register(SubService)
# class SubServiceAdmin(admin.ModelAdmin):
#     list_display = ('name', 'service', 'price', 'duration_minutes', 'is_active')
#     list_filter = ('service', 'is_active')
#     search_fields = ('name', 'service__name')
#     prepopulated_fields = {'slug': ('name',)}


# ============================================================
# 4. LOCATION & CONTACT
# ============================================================

@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'is_active', 'latitude', 'longitude', 'map_link')
    search_fields = ('name', 'address')
    list_filter = ('is_active',)
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('latitude', 'longitude', 'map_link')

    def map_link(self, obj):
        if obj.latitude and obj.longitude:
            url = f"https://www.google.com/maps/search/?api=1&query={obj.latitude},{obj.longitude}"
            return format_html('<a href="{}" target="_blank">View on Map</a>', url)
        return "N/A"

    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'is_active')
        }),
        ("Address & Geocoding", {
            'fields': ('address', 'latitude', 'longitude', 'map_link')
        }),
    )


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'created_at', 'location', 'display_distance')
    readonly_fields = ('name', 'email', 'phone', 'message', 'user_lat', 'user_lon',
                       'distance_km', 'location', 'created_at')
    date_hierarchy = 'created_at'
    list_filter = ('location',)
    search_fields = ('name', 'email', 'message')

    def display_distance(self, obj):
        if obj.distance_km is not None:
            return f"{obj.distance_km} km"
        return "N/A"

    fieldsets = (
        (None, {
            'fields': ('name', 'email', 'phone', 'message', 'created_at')
        }),
        ("Geo & Distance Info", {
            'fields': ('location', 'user_lat', 'user_lon', 'distance_km')
        }),
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


# ============================================================
# 5. TEAM & TESTIMONIALS
# ============================================================

@admin.register(BusinessTeamMember)
class BusinessTeamMemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'order')
    list_editable = ('order',)
    search_fields = ('name', 'role')


@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ('name', 'rating', 'company')
    list_filter = ('rating',)
    search_fields = ('name', 'company', 'content')


from django.contrib import admin
from .models import ClientLogo, AboutUs
from django.utils.html import format_html


# -------------------------
# CLIENT LOGO ADMIN
# -------------------------
@admin.register(ClientLogo)
class ClientLogoAdmin(admin.ModelAdmin):
    list_display = ("id", "preview", "name", "order")
    list_editable = ("order",)
    search_fields = ("name",)
    ordering = ("order",)

    def preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" width="60" style="border-radius:4px;" />', obj.logo.url)
        return "No Image"

    preview.short_description = "Logo"


# -------------------------
# ABOUT US ADMIN
# -------------------------
@admin.register(AboutUs)
class AboutUsAdmin(admin.ModelAdmin):
    list_display = ("id", "heading", "short_subheading", "order", "preview")
    list_editable = ("order",)
    search_fields = ("heading", "subheading")
    ordering = ("order",)

    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="60" style="border-radius:4px;" />', obj.image.url)
        return "No Image"

    preview.short_description = "Image"

    def short_subheading(self, obj):
        return obj.subheading[:50] + ("..." if len(obj.subheading) > 50 else "")

    short_subheading.short_description = "Subheading"


from django.contrib import admin
from .models import CompanyPage

@admin.register(CompanyPage)
class CompanyPageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'url', 'is_active', 'order')
    list_editable = ('order', 'is_active')
    prepopulated_fields = {"slug": ("title",)}


from django.contrib import admin
from .models import AboutUsPage, AboutUsSection

# -------------------------
# About Us Section Admin
# -------------------------
@admin.register(AboutUsSection)
class AboutUsSectionAdmin(admin.ModelAdmin):
    list_display = ("heading", "title", "order", "image_preview")
    list_editable = ("order",)
    ordering = ("order",)
    search_fields = ("heading", "content")
    list_filter = ("title",)

    def image_preview(self, obj):
        if obj.image:
            return f'<img src="{obj.image.url}" width="100" />'
        return "-"
    image_preview.allow_tags = True
    image_preview.short_description = "Image Preview"


# -------------------------
# About Us Page Admin
# -------------------------
class AboutUsSectionInline(admin.TabularInline):
    model = AboutUsPage.sections.through
    extra = 1
    verbose_name = "Section"
    verbose_name_plural = "Sections"

@admin.register(AboutUsPage)
class AboutUsPageAdmin(admin.ModelAdmin):
    list_display = ("page_title", "hero_heading")
    inlines = [AboutUsSectionInline]
    search_fields = ("page_title", "hero_heading")
    readonly_fields = ("display_hero_preview",)

    def display_hero_preview(self, obj):
        if obj.hero_image:
            return f'<img src="{obj.hero_image.url}" width="200" />'
        return "-"
    display_hero_preview.allow_tags = True
    display_hero_preview.short_description = "Hero Image Preview"


from django.contrib import admin
from .models import CompanyPage, PageSection, CTA

# ===========================
# INLINES FOR COMPANY PAGES
# ===========================

class PageSectionInline(admin.TabularInline):
    model = PageSection
    extra = 1
    fields = ('heading', 'content', 'image', 'order')
    ordering = ('order',)
    readonly_fields = ()

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" width="80" />', obj.image.url)
        return "No Image"
    image_preview.short_description = "Preview"

class CTAInline(admin.TabularInline):
    model = CTA
    extra = 1
    fields = ('label', 'url', 'primary', 'order')
    ordering = ('order',)

# ===========================
# COMPANY PAGE ADMIN
# ===========================

# @admin.register(CompanyPage)
# class CompanyPageAdmin(admin.ModelAdmin):
#     list_display = ('title', 'slug', 'url', 'is_active', 'order')
#     list_editable = ('order', 'is_active')
#     prepopulated_fields = {"slug": ("title",)}
#     inlines = [PageSectionInline, CTAInline]

# Add inlines to the existing CompanyPageAdmin
CompanyPageAdmin.inlines = [PageSectionInline, CTAInline]

# ===========================
# OPTIONAL STANDALONE ADMIN
# ===========================

@admin.register(PageSection)
class PageSectionAdmin(admin.ModelAdmin):
    list_display = ('page', 'heading', 'order')
    list_editable = ('order',)
    search_fields = ('heading', 'content')
    ordering = ('page', 'order')

@admin.register(CTA)
class CTAAdmin(admin.ModelAdmin):
    list_display = ('page', 'label', 'primary', 'order')
    list_editable = ('order',)
    list_filter = ('primary',)
    search_fields = ('label',)
    ordering = ('page', 'order')
