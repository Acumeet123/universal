// angular
import { Inject, NgModule, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Http, HttpModule } from '@angular/http';
import { BrowserModule } from '@angular/platform-browser';
// import { RouterModule, Routes } from '@angular/router';
import { RouterModule } from '@angular/router';

// libs
import { readFileSync } from 'fs';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import * as _ from 'lodash';
import { HttpTransferModule } from '@ngx-universal/state-transfer';
import { CacheModule, Cached, CacheKey, CacheService } from '@ngx-cache/core';
import { ConfigModule, ConfigLoader, ConfigService } from '@ngx-config/core';
import { ConfigHttpLoader } from '@ngx-config/http-loader';
import { ConfigFsLoader } from '@ngx-config/fs-loader';
import { UniversalConfigLoader } from '@ngx-universal/config-loader';
import { MetaModule, MetaLoader, MetaStaticLoader } from '@nglibs/meta';
// import { I18NRouterModule, I18NRouterLoader, I18N_ROUTER_PROVIDERS, RAW_ROUTES } from '@nglibs/i18n-router';
// import { I18NRouterConfigLoader } from '@nglibs/i18n-router-config-loader';
import { TranslateModule, TranslateService, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// routes & components
import { routes } from './app.routes';
import { AppComponent } from './app.component';
import { ChangeLanguageComponent } from './change-language.component';

// for AoT compilation
export function configFactory(platformId: any, http: Http): ConfigLoader {
  const serverLoader = new ConfigFsLoader('./public/assets/config.json');
  const browserLoader = new ConfigHttpLoader(http, './assets/config.json');

  return new UniversalConfigLoader(platformId, serverLoader, browserLoader);
}

export function metaFactory(config: ConfigService, translate: TranslateService): MetaLoader {
  return new MetaStaticLoader({
    callback: (key: string) => translate.get(key),
    pageTitlePositioning: config.getSettings().seo.pageTitlePositioning,
    pageTitleSeparator: config.getSettings().seo.pageTitleSeparator,
    applicationName: config.getSettings().system.applicationName,
    applicationUrl: config.getSettings().system.applicationUrl,
    defaults: {
      title: config.getSettings().seo.defaultPageTitle,
      description: config.getSettings().seo.defaultMetaDescription,
      'generator': '@nglibs',
      'og:site_name': config.getSettings().system.applicationName,
      'og:type': 'website',
      'og:locale': config.getSettings().i18n.defaultLanguage.culture,
      'og:locale:alternate': _.map(config.getSettings().i18n.availableLanguages, 'culture').toString()
    }
  });
}

// export function i18nRouterFactory(config: ConfigService, rawRoutes: Routes): I18NRouterLoader {
//   return new I18NRouterConfigLoader(config, rawRoutes, 'routes');
// }

export class TranslateUniversalLoader implements TranslateLoader {
  constructor(private readonly platformId: any,
              private readonly http: Http,
              private readonly staticPath: string = 'public',
              private readonly prefix: string = 'i18n',
              private readonly suffix: string = '.json') {
  }

  @Cached('ngx-translate__translations')
  public getTranslation(@CacheKey lang: string): Observable<any> {
    if (isPlatformServer(this.platformId)) {
      return Observable.create((observer: Observer<any>) => {
        observer.next(JSON.parse(readFileSync(`./${this.staticPath}/${this.prefix}/${lang}${this.suffix}`, 'utf8')));
        observer.complete();
      });
    }

    const httpLoader = new TranslateHttpLoader(this.http, this.prefix, this.suffix);
    return httpLoader.getTranslation(lang);
  }
}

export function translateFactory(platformId: any, http: Http): TranslateLoader {
  return new TranslateUniversalLoader(platformId, http, 'public', './assets/i18n/');
}

@NgModule({
  imports: [
    BrowserModule,
    HttpTransferModule.forRoot(),
    RouterModule.forRoot(routes),
    HttpModule,
    CacheModule.forRoot(),
    ConfigModule.forRoot({
      provide: ConfigLoader,
      useFactory: (configFactory),
      deps: [PLATFORM_ID, Http]
    }),
    MetaModule.forRoot({
      provide: MetaLoader,
      useFactory: (metaFactory),
      deps: [ConfigService, TranslateService]
    }),
    // I18NRouterModule.forRoot(routes, [
    //   {
    //     provide: I18NRouterLoader,
    //     useFactory: (i18nRouterFactory),
    //     deps: [ConfigService, RAW_ROUTES]
    //   }
    // ]),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: translateFactory,
        deps: [PLATFORM_ID, Http]
      }
    })
  ],
  declarations: [
    AppComponent,
    ChangeLanguageComponent
  ],
  exports: [AppComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(@Inject(PLATFORM_ID) private readonly platformId: any) {
  }
}
