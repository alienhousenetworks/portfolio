from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.views.generic.base import RedirectView
from core.models import SiteConfiguration

class FaviconRedirectView(RedirectView):
    permanent = False
    def get_redirect_url(self, *args, **kwargs):
        config = SiteConfiguration.objects.first()
        if config and config.favicon:
            return config.favicon.url
        return '/static/favicon.ico'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('favicon.ico', FaviconRedirectView.as_view()),
    path('', include('core.urls')), 
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)