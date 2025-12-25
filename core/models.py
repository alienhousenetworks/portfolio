from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator
from geopy.distance import geodesic

import requests


# ============================================================
# 1. BASE MODEL (Slug, Active, Timestamps)
# ============================================================
class BaseModel(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        return super().save(*args, **kwargs)


# ============================================================
# 2. GLOBAL SITE SETTINGS / LANDING PAGE SECTIONS
# ============================================================

class SiteConfiguration(models.Model):
    site_name = models.CharField(max_length=100, default="ALIENHOUSE")
    logo_highlight_text = models.CharField(max_length=100, default="HOUSE")

    address = models.CharField(max_length=200, default="Rajkot, Gujarat, India")
    email = models.EmailField(default="signal@alienhouse.net")
    phone = models.CharField(max_length=50, default="+91 999-999-9999")
    footer_text = models.CharField(max_length=200, default="Galactic Rights Reserved.")

    def __str__(self):
        return "Site Configuration"

    class Meta:
        verbose_name = "Site Configuration"
# -------------------------
# ABOUT US SECTION inside home page indes.html
# -------------------------
class AboutUs(models.Model):
    heading = models.CharField(max_length=255)
    subheading = models.TextField(blank=True)
    image = models.ImageField(upload_to="about/", blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.heading


# -------------------------
# HERO SLIDER SECTION
# -------------------------        

from django.db import models

class HeroSection(models.Model):
    status_text = models.CharField(max_length=100, default="SYSTEM STATUS: OPTIMAL // 2025.Q4")
    main_heading_line_1 = models.CharField(max_length=100, default="BEYOND")
    main_heading_gradient_text = models.CharField(max_length=100, default="HUMANITY")
    sub_text = models.TextField(default="We engineer the post-human enterprise...")

    btn_primary_text = models.CharField(max_length=50, default="INITIATE PROTOCOL")
    btn_secondary_text = models.CharField(max_length=50, default="VIEW CAPABILITIES")

    coord_text = models.CharField(max_length=100, default="COORD: 23.0225° N, 72.5714° E")
    mem_text = models.CharField(max_length=100, default="MEM: 64TB / 128TB")

    def __str__(self):
        return f"Hero Section: {self.main_heading_line_1}"

# -------------------------
# CLIENT LOGOS SECTION
# -------------------------
class ClientLogo(models.Model):
    logo = models.ImageField(upload_to="clients/")
    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name


class ServiceModule(models.Model):
    sub_service = models.ForeignKey('SubService', on_delete=models.CASCADE, related_name="modules",null=True, blank=True)
    icon_name = models.CharField(max_length=50)
    module_id = models.CharField(max_length=20, default="MOD_01")
    title = models.CharField(max_length=100)
    description = models.TextField()
    features_list = models.TextField(help_text="Each line is a feature")
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title

    def get_features(self):
        return self.features_list.split("\n")




class TeamMemberPortfolio(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    job_title = models.CharField(max_length=100)
    image = models.ImageField(upload_to='team/')

    color_class = models.CharField(max_length=50, default="text-alien")
    border_color_class = models.CharField(max_length=50, default="border-alien")

    skill_name = models.CharField(max_length=50, default="NEURAL NETS")
    skill_percent = models.IntegerField(default=99)

    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.name


class ClientTicker(models.Model):
    name = models.CharField(max_length=100)
    def __str__(self):
        return self.name


class TacticalAdvantage(models.Model):
    icon_name = models.CharField(max_length=50, default="zap")
    title = models.CharField(max_length=100)
    description = models.TextField()
    def __str__(self):
        return self.title


class Project(models.Model):
    title = models.CharField(max_length=100)
    tech_stack = models.CharField(max_length=100)
    description = models.TextField()
    image = models.ImageField(upload_to='projects/')
    color_class = models.CharField(max_length=50, default="text-alien")
    def __str__(self):
        return self.title


class LabExperiment(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField()
    icon_name = models.CharField(max_length=50, default="flask-conical")
    progress_percent = models.IntegerField(default=50)
    color_class = models.CharField(max_length=50, default="text-purple-500")

    def __str__(self):
        return self.title


# ============================================================
# 3. COMPANY PROFILE / BUSINESS WEBSITE STRUCTURE
# ============================================================

class CompanyProfile(models.Model):
    site_name = models.CharField(max_length=255)
    tagline = models.CharField(max_length=255, blank=True)
    about = models.TextField(blank=True)

    logo = models.ImageField(upload_to="company/logo/", blank=True, null=True)
    favicon = models.ImageField(upload_to="company/favicon/", blank=True, null=True)

    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)

    facebook = models.URLField(blank=True)
    instagram = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    twitter = models.URLField(blank=True)
    youtube = models.URLField(blank=True)

    def __str__(self):
        return self.site_name


# ============================================================
# 4. LOCATION WITH AUTO GEO + DISTANCE
# ============================================================

from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator
# GIS imports removed: from django.contrib.gis.db import models as gis_models
# GIS imports removed: from django.contrib.gis.geos import Point 
import requests

# Import the distance calculation tool from geopy
from geopy.distance import geodesic 

# NOTE: The BaseModel definition must exist above this (as provided in your context)
# You should also ensure the other necessary imports (like BaseModel) are present.

class Location(BaseModel):
    address = models.CharField(max_length=255)

    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    # The PointField is removed as it required GeoDjango/GDAL

    geo_api = "https://nominatim.openstreetmap.org/search"

    def auto_geocode(self):
        """
        Looks up the coordinates for the address using OpenStreetMap's Nominatim API.
        The latitude and longitude are stored directly in the model's float fields.
        """
        # If coordinates already exist, skip geocoding
        if self.latitude and self.longitude:
            return
            
        try:
            response = requests.get(
                self.geo_api,
                params={"q": self.address, "format": "json"}
            ).json()

            if response:
                # Store coordinates as standard floats
                self.latitude = float(response[0]["lat"])
                self.longitude = float(response[0]["lon"])
                # GeoDjango Point object creation removed
        except Exception:
            # Handle API or network errors silently if geocoding fails
            pass

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1

            while self.__class__.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            self.slug = slug

        super().save(*args, **kwargs)

            
        # # The base save method is called after geocoding
        # super().save(*args, **kwargs)

    def distance_from(self, user_lat, user_lon):
        """
        Calculates the Geodesic distance (shortest path on an ellipsoid) 
        between this Location and a user's coordinate, using the geopy library.
        Returns distance in kilometers (km).
        """
        if not self.latitude or not self.longitude:
            return None
            
        # Define the two points as (latitude, longitude) tuples
        location_coords = (self.latitude, self.longitude)
        user_coords = (user_lat, user_lon)
        
        # Calculate the distance using geopy.geodesic and retrieve the distance in km
        distance_result_km = geodesic(location_coords, user_coords).km
        
        # Rounding and returning the result
        return round(distance_result_km, 2)

    def __str__(self):
        return f"{self.name} ({self.address})"


# ============================================================
# 5. SERVICE + SUBSERVICE (Business Services)
# ============================================================
# Inheriting from your existing BaseModel
class Service(BaseModel):
    icon = models.CharField(max_length=100, help_text="Lucide icon name (e.g. 'cpu', 'shield')", null=True, blank=True)

    # Add this ↓↓↓
    service_image = models.ImageField(
        upload_to="services/main/",
        blank=True,
        null=True,
        help_text="Main image for the service"
    )

    hero_image = models.ImageField(upload_to="services/hero/", blank=True, null=True)

    short_description = models.CharField(max_length=300, help_text="Shown on cards/lists")
    description = models.TextField(help_text="Main content for the detail page")
    technical_specs = models.TextField(blank=True, help_text="Technical details or tech stack")

    advantage_1 = models.CharField(max_length=200, blank=True)
    advantage_2 = models.CharField(max_length=200, blank=True)
    advantage_3 = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.name



# models.py

class SubService(BaseModel):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="sub_services")
    
    # New Image Field
    image = models.ImageField(upload_to="services/sub_services/", blank=True, null=True)

    # Existing fields...
    price_range = models.CharField(max_length=100, blank=True, help_text="e.g. '$500 - $1000'")
    delivery_time = models.CharField(max_length=100, blank=True, help_text="e.g. '2 Weeks'")
    description = models.TextField(blank=True)
    is_popular = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.service.name} -> {self.name}"


# ============================================================
# 6. TEAM (for Company Website)
# ============================================================

class BusinessTeamMember(models.Model):
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    image = models.ImageField(upload_to="team/", blank=True, null=True)

    linkedin = models.URLField(blank=True)
    instagram = models.URLField(blank=True)

    order = models.PositiveIntegerField(default=1)

    def __str__(self):
        return self.name


# ============================================================
# 7. TESTIMONIALS
# ============================================================

class Testimonial(models.Model):
    name = models.CharField(max_length=255)
    content = models.TextField()
    rating = models.PositiveIntegerField(default=5)
    company = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.name} ({self.rating}⭐)"


# ============================================================
# 8. CONTACT QUERIES with Distance Calculation
# ============================================================

# Assuming all imports from the original file are present at the top, 
# including the updated Location model.

class ContactMessage(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    message = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    # Link to the Location record (e.g., the closest store/office)
    location = models.ForeignKey('Location', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Store the user's provided coordinates
    user_lat = models.FloatField(null=True, blank=True)
    user_lon = models.FloatField(null=True, blank=True)
    
    # Field to store the calculated distance
    distance_km = models.FloatField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Calculate the distance upon saving if all necessary data is present
        if self.user_lat and self.user_lon and self.location:
            # Calls the non-GIS distance_from method on the related Location object
            dist = self.location.distance_from(self.user_lat, self.user_lon)
            if dist is not None:
                self.distance_km = dist
                
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} → {self.created_at}"




# core/models.py
from django.db import models

class SiteSettings(models.Model):
    site_name = models.CharField(max_length=100, default="AlienHouse")
    logo = models.ImageField(upload_to='logos/', null=True, blank=True)
    footer_text = models.TextField(default="© 2025 AlienHouse Networks. All Systems Nominal.")
    default_logo_url = models.CharField(max_length=255, default='/static/images/default_logo.png')

    def get_logo_url(self):
        return self.logo.url if self.logo else self.default_logo_url

    def __str__(self):
        return "Site Settings"


class FooterLink(models.Model):
    title = models.CharField(max_length=50)
    url = models.URLField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    category = models.CharField(max_length=50, choices=[("services", "Services"), ("company", "Company"), ("social", "Social")])
    icon_name = models.CharField(max_length=50, blank=True, null=True)  # for lucide icons

    class Meta:
        ordering = ['category', 'order']

    def __str__(self):
        return f"{self.category} - {self.title}"


from django.db import models

class ContactInfo(models.Model):
    CONTACT_CHOICES = [
        ('mail', 'mail'),
        ('phone', 'Phone'),
        ('twitter', 'Twitter'),
        ('linkedin', 'LinkedIn'),
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('youtube', 'YouTube'),
    ]

    contact_type = models.CharField(max_length=50, choices=CONTACT_CHOICES)
    display_value = models.CharField(max_length=255, help_text="Text to show, e.g., email address or username")
    link = models.URLField(
        blank=True, 
        null=True, 
        help_text="Link to profile or use mailto: for email, tel: for phone"
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.contact_type} - {self.display_value}"

    def get_link(self):
        """
        Returns the proper href based on type.
        For email and phone, creates mailto: and tel: links if link is empty.
        """
        if self.link:
            return self.link
        if self.contact_type == 'mail':
            return f"mailto:{self.display_value}"
        elif self.contact_type == 'phone':
            return f"tel:{self.display_value}"
        return "#"



from django.db import models
from django.urls import reverse

class CompanyPage(models.Model):
    """
    Model to manage company pages in the navbar dropdown dynamically.
    Example: About Us, Blog, Careers
    """
    title = models.CharField(max_length=100, help_text="Page title shown in the menu")
    slug = models.SlugField(unique=True, help_text="URL slug for this page")
    url = models.URLField(blank=True, null=True, help_text="Optional: external URL. Leave empty for internal pages")
    is_active = models.BooleanField(default=True, help_text="Show or hide in the menu")
    order = models.PositiveIntegerField(default=0, help_text="Order in the dropdown menu")

    class Meta:
        ordering = ['order']
        verbose_name = "Company Page"
        verbose_name_plural = "Company Pages"

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        """
        Returns the internal URL if 'url' is empty, otherwise returns the external URL.
        """
        if self.url:
            return self.url
        return reverse('company_page_detail', kwargs={'slug': self.slug})



class PageSection(models.Model):
    page = models.ForeignKey('CompanyPage', related_name='sections', on_delete=models.CASCADE)
    heading = models.CharField(max_length=200)
    content = models.TextField()
    image = models.ImageField(upload_to='page_sections/', blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.page.title} - {self.heading}"



# core/models.py
from django.db import models
from django.utils.text import slugify

class AboutUsSection(models.Model):
    """
    Represents a section of the About Us page.
    """
    SECTION_CHOICES = [
        ("overview", "Company Overview"),
        ("mission_vision", "Mission & Vision"),
        ("history", "Company Story / History"),
        ("core_values", "Core Values / Principles"),
        ("why_choose_us", "Why Choose Us"),
        ("achievements", "Achievements / Recognition"),
        ("call_to_connect", "Closing / Call to Connect"),
    ]

    title = models.CharField(max_length=100, choices=SECTION_CHOICES)
    heading = models.CharField(max_length=200)
    content = models.TextField(help_text="You can use HTML here for rich content")
    image = models.ImageField(upload_to="about_us/", blank=True, null=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"{self.get_title_display()} - {self.heading}"


class AboutUsPage(models.Model):
    """
    Represents the full About Us page. Allows flexibility for future additions.
    """
    page_title = models.CharField(max_length=200, default="About Us")
    sections = models.ManyToManyField(AboutUsSection, related_name="pages")
    hero_image = models.ImageField(upload_to="about_us/hero/", blank=True, null=True)
    hero_heading = models.CharField(max_length=200, blank=True, default="About AlienHouse")
    hero_subtext = models.TextField(blank=True)

    def __str__(self):
        return self.page_title



# class PageSection(models.Model):
#     page = models.ForeignKey('CompanyPage', related_name='sections', on_delete=models.CASCADE)
#     heading = models.CharField(max_length=200)
#     content = models.TextField()
#     image = models.ImageField(upload_to='page_sections/', blank=True, null=True)
#     order = models.PositiveIntegerField(default=0)

#     class Meta:
#         ordering = ['order']

#     def __str__(self):
#         return f"{self.page.title} - {self.heading}"


class CTA(models.Model):
    page = models.ForeignKey('CompanyPage', related_name='ctas', on_delete=models.CASCADE)
    label = models.CharField(max_length=50)
    url = models.URLField(blank=True, null=True)
    primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.page.title} - {self.label}"

# new modesl