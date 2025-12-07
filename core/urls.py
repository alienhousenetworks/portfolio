from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    # The dynamic path:
    path('services/<slug:slug>/', views.service_detail, name='service_detail'),
    path("about-us/", views.about_us, name="about_us"),
    path('company/<slug:slug>/', views.company_page_detail, name='company_page_detail'),

]