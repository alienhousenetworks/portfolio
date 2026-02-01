from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    # Separate name for the game page so it doesn't override the main 'index' URL
    path('game/', views.indexgame, name='game'),
    # The dynamic path:
    path('services/<slug:slug>/', views.service_detail, name='service_detail'),
    path("about-us/", views.about_us, name="about_us"),
    path('careers/', views.career_list, name='career_list'),
    path('careers/<slug:slug>/', views.job_detail, name='job_detail'),
    path('company/<slug:slug>/', views.company_page_detail, name='company_page_detail'),
]