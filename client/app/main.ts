import { bootstrap }    from '@angular/platform-browser-dynamic';
import { provideRouter } from '@angular/router';
import { AppComponent } from './components/app.component';
import { appRoutes } from './components/app.routing';
import { disableDeprecatedForms, provideForms } from '@angular/forms';
import { HTTP_PROVIDERS } from '@angular/http';
import { AUTH_PROVIDERS } from 'angular2-jwt/angular2-jwt';

bootstrap(AppComponent, [
  disableDeprecatedForms(), // disable deprecated forms
  provideForms(),
  provideRouter(appRoutes), // enable new forms module
  AUTH_PROVIDERS,
  HTTP_PROVIDERS
])
.catch(err => console.log(`Error bootstrapping App ${err}`));

