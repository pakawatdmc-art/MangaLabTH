from django.urls import path
from . import views

app_name = 'reader'

urlpatterns = [
    path('', views.home, name='home'),
    path('manga/<int:pk>/', views.manga_detail, name='manga_detail'),
    path('chapter/<int:pk>/', views.chapter_read, name='chapter_read'),
]
