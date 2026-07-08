from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    # The dynamic path:
    path('services/<slug:slug>/', views.service_detail, name='service_detail'),
    path("about-us/", views.about_us, name="about_us"),
    path('careers/', views.career_list, name='career_list'),
    path('careers/<slug:slug>/', views.job_detail, name='job_detail'),
    path('company/<slug:slug>/', views.company_page_detail, name='company_page_detail'),
    path('api/contact/submit/', views.contact_submit, name='contact_submit'),
    
    # Industry Training System
    path('training/', views.training_list, name='training_list'),
    path('training/subfield/<slug:slug>/', views.training_subfield_detail, name='training_subfield_detail'),
    path('training/enroll/<int:package_id>/', views.training_enroll, name='training_enroll'),
    path('training/payment/callback/', views.training_payment_callback, name='training_payment_callback'),
    path('api/training/validate-referral/', views.validate_referral, name='validate_referral'),
    
    # LMS Dashboard (Staff/Admin Only)
    path('admin/lms-dashboard/', views.lms_dashboard, name='lms_dashboard'),
    path('admin/lms-dashboard/update-status/<int:pk>/', views.update_enrollment_status, name='update_enrollment_status'),
]