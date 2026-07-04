from django.urls import path

from . import views

urlpatterns = [
    path('', views.world, name='game_world'),
]