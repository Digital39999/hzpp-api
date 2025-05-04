export default {
	baseUrl: 'https://www.hzpp.hr',
	portalUrl: 'https://prodaja.hzpp.hr/hr/Ticket/Journey',

	transportationsUrl: 'https://prodaja.hzpp.hr/hr/Ticket/GetTransportations',
	trainCompositionUrl: 'https://traindelay.hzpp.hr/train/composition',

	locomotivesUrl: 'https://www.hzpp.hr/lokomotive',
	trainsUrl: 'https://www.hzpp.hr/vlakovi',
	wagonsUrl: 'https://www.hzpp.hr/vagoni',
};

// Types.
export type ManagerConfig = {
	/**
	 * Maximum allowed time deviation (in minutes) for fetching train information.
	 *
	 * - A positive number defines the time window (in minutes) around departure time when train info should be fetched.
	 * - Set to `-1` to disable time window checks and always fetch info.
	 */
	minuteDeviationTrainInfo: number;
	/**
	 * Token for fetching current train information and train composition.
	 */
	authToken: string;
}
