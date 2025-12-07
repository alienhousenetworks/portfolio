from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    # The dynamic path:
    path('services/<slug:slug>/', views.service_detail, name='service_detail'),
]