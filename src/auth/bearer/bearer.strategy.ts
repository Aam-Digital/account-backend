import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { HttpService } from '@nestjs/axios';
import jwtDecode from 'jwt-decode';
import { catchError, firstValueFrom, map } from 'rxjs';

@Injectable()
export class BearerStrategy extends PassportStrategy(Strategy) {
  constructor(private http: HttpService) {
    super();
  }

  validate(token): Promise<any> {
    const { iss, azp } = jwtDecode<{ iss: string; azp: string }>(token);
    const realm = iss.match(/realms\/(.+)$/)[1];
    const url = iss + '/protocol/openid-connect/userinfo';
    return firstValueFrom(
      this.http
        .get(url, { headers: { Authorization: 'Bearer ' + token } })
        .pipe(
          map((req) => Object.assign(req.data, { realm: realm, client: azp })),
          catchError(() => {
            throw new UnauthorizedException();
          }),
        ),
    );
  }
}
