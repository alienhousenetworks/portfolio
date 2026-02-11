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
    slug = models.SlugField(unique=True, blank=True, help_text="The URL-friendly version of the name. Auto-generated if left blank.")
    is_active = models.BooleanField(default=True, verbose_name="Active", help_text="Uncheck to hide this item from the site without deleting it.")

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
    site_name = models.CharField(max_length=100, default="ALIENHOUSE", help_text="The main name of the website displayed in the browser tab.")
    logo = models.ImageField(upload_to='site_logos/', blank=True, null=True, help_text="Upload the main site logo.")
    favicon = models.ImageField(upload_to='site_favicons/', blank=True, null=True, help_text="Upload the site favicon (ideally 32x32 or 16x16 png/ico).")
    logo_highlight_text = models.CharField(max_length=100, default="HOUSE", help_text="Part of the logo text to highlight (usually in a different color).")

    address = models.CharField(max_length=200, default="Rajkot, Gujarat, India", help_text="Physical address displayed in the footer.")
    email = models.EmailField(default="signal@alienhouse.net", help_text="Contact email address.")
    phone = models.CharField(max_length=50, default="+91 999-999-9999", help_text="Contact phone number.")
    footer_text = models.CharField(max_length=200, default="Galactic Rights Reserved.", help_text="Text displayed at the very bottom of the page.")

    def __str__(self):
        return "Site Configuration"

    class Meta:
        verbose_name = "Global Site Configuration"
        verbose_name_plural = "Global Site Configurations"
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
    status_text = models.CharField(max_length=100, default="SYSTEM STATUS: OPTIMAL // 2025.Q4", help_text="Small text badge at the top of the hero section.")
    main_heading_line_1 = models.CharField(max_length=100, default="BEYOND", verbose_name="Main Heading (Line 1)")
    main_heading_gradient_text = models.CharField(max_length=100, default="HUMANITY", verbose_name="Highlighted Text", help_text="This text will have a gradient effect.")
    sub_text = models.TextField(default="We engineer the post-human enterprise...", verbose_name="Subheading Text")

    btn_primary_text = models.CharField(max_length=50, default="INITIATE PROTOCOL", verbose_name="Primary Button Label")
    btn_secondary_text = models.CharField(max_length=50, default="VIEW CAPABILITIES", verbose_name="Secondary Button Label")

    coord_text = models.CharField(max_length=100, default="COORD: 23.0225° N, 72.5714° E", verbose_name="Coordinates Text", help_text="Decorative coordinates shown on screen.")
    mem_text = models.CharField(max_length=100, default="MEM: 64TB / 128TB", verbose_name="Memory Stat Text", help_text="Decorative memory usage statistics.")

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
    sub_service = models.ForeignKey('SubService', on_delete=models.CASCADE, related_name="modules",null=True, blank=True, help_text="Link this module to a specific sub-service.")
    icon_name = models.CharField(max_length=50, help_text="Icon name from Lucide (e.g., 'server', 'database').")
    module_id = models.CharField(max_length=20, default="MOD_01", verbose_name="Module ID / Badge", help_text="Short ID code displayed on the card.")
    title = models.CharField(max_length=100)
    description = models.TextField()
    features_list = models.TextField(help_text="Enter features, one per line.")
    order = models.IntegerField(default=0, help_text="Display order (lowest first).")

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title

    def get_features(self):
        return self.features_list.split("\n")




class TeamMemberPortfolio(models.Model):
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=100, help_text="e.g. 'Lead Architect'")
    job_title = models.CharField(max_length=100, help_text="e.g. 'Senior Developer'")
    image = models.ImageField(upload_to='team/')

    color_class = models.CharField(max_length=50, default="text-alien", help_text="Tailwind text color class (e.g. 'text-alien', 'text-blue-500').")
    border_color_class = models.CharField(max_length=50, default="border-alien", help_text="Tailwind border color class.")

    skill_name = models.CharField(max_length=50, default="NEURAL NETS", help_text="Primary skill displayed.")
    skill_percent = models.IntegerField(default=99, help_text="Skill mastery percentage (0-100).")

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
    icon_name = models.CharField(max_length=50, default="zap", help_text="Icon name from Lucide (e.g. 'zap', 'shield').")
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
    icon_name = models.CharField(max_length=50, default="flask-conical", help_text="Lucide icon name.")
    progress_percent = models.IntegerField(default=50, help_text="Completion percentage (0-100).")
    color_class = models.CharField(max_length=50, default="text-purple-500", help_text="Tailwind color class.")

    def __str__(self):
        return self.title


# ============================================================
# 3. COMPANY PROFILE / BUSINESS WEBSITE STRUCTURE
# ============================================================

class CompanyProfile(models.Model):
    site_name = models.CharField(max_length=255, verbose_name="Company Name")
    tagline = models.CharField(max_length=255, blank=True)
    about = models.TextField(blank=True, verbose_name="About The Company")

    logo = models.ImageField(upload_to="company/logo/", blank=True, null=True)
    favicon = models.ImageField(upload_to="company/favicon/", blank=True, null=True, help_text="Small icon shown in browser tab.")

    email = models.EmailField(blank=True, help_text="Primary public email.")
    phone = models.CharField(max_length=20, blank=True, help_text="Primary phone number.")
    whatsapp = models.CharField(max_length=20, blank=True, help_text="WhatsApp number.")

    facebook = models.URLField(blank=True, help_text="Full URL to Facebook profile.")
    instagram = models.URLField(blank=True, help_text="Full URL to Instagram profile.")
    linkedin = models.URLField(blank=True, help_text="Full URL to LinkedIn profile.")
    twitter = models.URLField(blank=True, help_text="Full URL to Twitter/X profile.")
    youtube = models.URLField(blank=True, help_text="Full URL to YouTube channel.")

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
    address = models.CharField(max_length=255, help_text="Full physical address.")

    latitude = models.FloatField(blank=True, null=True, help_text="Auto-detected from address. Leave blank to update.")
    longitude = models.FloatField(blank=True, null=True, help_text="Auto-detected from address. Leave blank to update.")
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
from django.db import models

class Service(BaseModel):
    order = models.PositiveIntegerField(default=0, help_text="Order in which this service appears (lowest number first).")
    
    icon = models.CharField(
        max_length=100,
        help_text="Lucide icon name (e.g. 'cpu', 'shield', 'code').",
        null=True,
        blank=True
    )
    
    service_image = models.ImageField(
        upload_to="services/main/",
        blank=True,
        null=True,
        help_text="Main image for the service"
    )

    service_video = models.FileField(
        upload_to="services/video/",
        blank=True,
        null=True,
        help_text="Optional background video (mp4/webm)"
    )

    hero_image = models.ImageField(
        upload_to="services/hero/",
        blank=True,
        null=True
    )

    short_description = models.CharField(
        max_length=300,
        help_text="Shown on cards/lists"
    )
    
    description = models.TextField(help_text="Full description of the service for the detail page.")
    technical_specs = models.TextField(blank=True, help_text="Technical stack or specifications (HTML allowed).")

    advantage_1 = models.CharField(max_length=200, blank=True)
    advantage_2 = models.CharField(max_length=200, blank=True)
    advantage_3 = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['order', 'name']  # Default ordering

    def __str__(self):
        return self.name




# models.py

class SubService(BaseModel):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="sub_services")
    
    # New Image Field
    image = models.ImageField(upload_to="services/sub_services/", blank=True, null=True)

    # Existing fields...
    price_range = models.CharField(max_length=100, blank=True, help_text="Approximate cost, e.g. '$500 - $1000'.")
    delivery_time = models.CharField(max_length=100, blank=True, help_text="Estimated time, e.g. '2 Weeks'.")
    description = models.TextField(blank=True, help_text="Brief description of this specific sub-service.")
    is_popular = models.BooleanField(default=False, verbose_name="Mark as Popular", help_text="Check to highlight this as a popular choice.")
    
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
    company = models.CharField(max_length=255, blank=True, help_text="Optional company name.")
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
    label = models.CharField(max_length=50, help_text="Button text.")
    url = models.URLField(blank=True, null=True, help_text="URL to link to.")
    primary = models.BooleanField(default=False, verbose_name="Is Primary Action", help_text="Check if this is the main button (styled differently).")
    order = models.PositiveIntegerField(default=0, help_text="Order of appearance.")

    class Meta:
        ordering = ['order']
        verbose_name = "Call to Action (Button)"
        verbose_name_plural = "Call to Action (Buttons)"

    def __str__(self):
        return f"{self.page.title} - {self.label}"

# new modesl


# ============================================================
# 9. CAREERS & JOBS
# ============================================================

class JobPost(BaseModel):
    JOB_TYPES = [
        ('FULL_TIME', 'Full Time'),
        ('PART_TIME', 'Part Time'),
        ('CONTRACT', 'Contract'),
        ('FREELANCE', 'Freelance'),
        ('INTERNSHIP', 'Internship'),
    ]

    title = models.CharField(max_length=255)
    location = models.CharField(max_length=100, default="Remote", help_text="e.g. 'San Francisco', 'Remote', 'Hybrid'")
    job_type = models.CharField(max_length=50, choices=JOB_TYPES, default='FULL_TIME')
    salary_range = models.CharField(max_length=100, blank=True, help_text="e.g. '$100k - $120k', 'Competitive'")
    
    description = models.TextField(help_text="Full job description. HTML is allowed.")
    
    external_apply_url = models.URLField(
        blank=True, 
        null=True, 
        help_text="If set, the 'Apply Now' button will redirect here (e.g. Google Form). If empty, the built-in form is used."
    )
    
    posted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-posted_at']

    def __str__(self):
        return self.title


class JobApplication(models.Model):
    job = models.ForeignKey(JobPost, on_delete=models.CASCADE, related_name='applications')
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    
    resumes_upload_path = "careers/resumes/"
    resume = models.FileField(upload_to=resumes_upload_path, help_text="PDF or Docx file.")
    
    cover_letter = models.TextField(blank=True)
    
    applied_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.full_name} -> {self.job.title}"