import { StatusMapsI } from "../common/status.types";

export function mapStatusInt(domain: string, status: number) {

    const statusMaps: StatusMapsI = {
        '0': {
            status: 'available',
            verbose: `${domain} is available for registration.`
        },
        '1': {
            status: 'taken',
            verbose: `${domain} is currently registered.`
        },
        '2': {
            status: 'reserved',
            verbose: `${domain} is reserved for a specific claimant.`
        }
    }

    return statusMaps[status] ?? {
        status: 'unknown',
        verbose: `The status of ${domain} is unknown. It's possible that the queried domain is invalid.`
    };

}

export enum DomainStatus {
    Available,
    Taken,
    Reserved,
}
