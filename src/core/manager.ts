import { JourneyOptions, JourneyRoutes, InternalJourneyData, JourneyRoutesInternalSchema, JourneyTimetable, RollingStockInfo, RollingStockInfoSchema, Station, StationSchema, JourneyRouteSchedule, TrainDetails, JourneyRouteScheduleSchema, TrainInfo, TrainInfoSchema, ExtendedJourneyRouteSchedule, ExtendedJourneyRouteScheduleSchema, ConvertToSegments, TransferDetails, JourneyRouteScheduleSegmentsSchema, ExtendedJourneyRoutes, ExtendedJourneyRoutesSchema, ExtendedJourney } from './parsers';
import { featuresToEnum, formatMinutesToTime, hashObject, matchStationName, parseZodError, timeStringToMinutes, validateJourney } from './utils';
import { CompositionTypeEnum, TrainStateEnum, TrainStatusEnum, TrainTypeEnum, TripTypeEnum } from './constants';
import config, { ManagerConfig } from './config';
import axios, { AxiosError } from 'axios';
import { FlexibleCache } from './cache';
import { Element } from 'domhandler';
import { load } from 'cheerio';
import { z } from 'zod';

export class HzppManager {
	private generalCache: FlexibleCache | null;

	private cachedStations: Station[] | null = null;

	private cachedWagons: RollingStockInfo[] | null = null;
	private cachedTrainTypes: RollingStockInfo[] | null = null;
	private cachedLocomotives: RollingStockInfo[] | null = null;

	private managerConfig: ManagerConfig = {
		minuteDeviationTrainInfo: 15,
		cacheTimeToLiveSeconds: 10800,
		authToken: '',
	};

	constructor (config?: Partial<ManagerConfig>) {
		if (config) this.managerConfig = { ...this.managerConfig, ...config };
		this.generalCache = this.managerConfig.cacheTimeToLiveSeconds && this.managerConfig.cacheTimeToLiveSeconds > 0
			? new FlexibleCache(this.managerConfig.cacheTimeToLiveSeconds)
			: null;
	}

	public async getStationById(id: string): Promise<Station | null> {
		if (!this.cachedStations) await this.getStations();
		if (!this.cachedStations) return null;

		const station = this.cachedStations.find((station) => station.id === id);
		return station || null;
	}

	public async getStations(force: boolean = false): Promise<Station[]> {
		if (this.cachedStations && !force) return this.cachedStations;

		const response = await axios.get(config.portalUrl).catch((err: AxiosError) => err.response);
		if (!response || response.status !== 200) throw new Error('Failed to fetch data.');
		else if (response.data.includes('došlo je do pogreške')) throw new Error('Invalid station data.');

		const $ = load(response.data);

		const select = $('#StartId');
		const options = select.find('option');
		const stations: Station[] = [];

		for (const option of options) {
			const id = $(option).attr('value');
			const name = $(option).text();

			if (id && name) stations.push({ id, name });
		}

		const parsed = z.array(StationSchema).safeParse(stations);
		if (!parsed.success) throw new Error(`Failed to parse station data: ${parseZodError(parsed.error).join(', ')}.`);

		this.cachedStations = parsed.data;
		return parsed.data;
	}

	public async getLocomotives(force: boolean = false): Promise<RollingStockInfo[]> {
		if (this.cachedLocomotives && !force) return this.cachedLocomotives;
		const data = await this.fetchRollingStockData(config.locomotivesUrl);

		this.cachedLocomotives = data;
		return data;
	}

	public async getWagons(force: boolean = false): Promise<RollingStockInfo[]> {
		if (this.cachedWagons && !force) return this.cachedWagons;
		const data = await this.fetchRollingStockData(config.wagonsUrl);

		this.cachedWagons = data;
		return data;
	}

	public async getTrainTypes(force: boolean = false): Promise<RollingStockInfo[]> {
		if (this.cachedTrainTypes && !force) return this.cachedTrainTypes;
		const data = await this.fetchRollingStockData(config.trainsUrl);

		this.cachedTrainTypes = data;
		return data;
	}

	private async fetchRollingStockData(url: string): Promise<RollingStockInfo[]> {
		const response = await axios.get(url).catch((err: AxiosError) => err.response);
		if (!response || response.status !== 200) throw new Error('Failed to fetch data.');
		else if (response.data.includes('došlo je do pogreške')) throw new Error('Invalid static data.');

		const $ = load(response.data);

		const elements = $('.articlebox');
		const locomotives: RollingStockInfo[] = [];
		for (const element of elements) {
			const image = $(element).find('img').attr('src');
			const name = $(element).find('h3').text();

			if (image && name) locomotives.push({ name, image: new URL(image, config.baseUrl).toString() });
		}

		const parsed = z.array(RollingStockInfoSchema).safeParse(locomotives);
		if (!parsed.success) throw new Error(`Failed to parse locomotive data: ${parseZodError(parsed.error).join(', ')}.`);
		return parsed.data;
	}

	public async getJourneyRoutes(journey: JourneyOptions): Promise<JourneyRoutes> {
		const { returnJourneys, outwardJourneys } = await this.getJourneyInternal(journey);
		return { returnJourneys, outwardJourneys };
	}

	private async getJourneyInternal(journey: JourneyOptions): Promise<InternalJourneyData> {
		validateJourney(journey);

		const cacheKey = hashObject(journey);
		if (this.generalCache && this.generalCache.has(cacheKey)) {
			const cachedData = this.generalCache.get<InternalJourneyData>(cacheKey);
			if (cachedData) return cachedData;
		}

		const url = new URL(config.portalUrl);
		url.searchParams.set('StartId', journey.startId);
		url.searchParams.set('DestId', journey.destId);
		url.searchParams.set('Class', journey.class.toString());
		url.searchParams.set('DepartureDate', journey.departureDate);

		if (journey.viaId) url.searchParams.set('ViaId', journey.viaId);
		if (journey.trainType !== undefined) url.searchParams.set('DirectTrains', journey.trainType === TrainTypeEnum.Direct ? 'True' : 'False');
		if (journey.passengerCount) {
			if (Array.isArray(journey.passengerCount)) {
				url.searchParams.set('Passenger1Count', journey.passengerCount[0].count.toString());
				url.searchParams.set('Passenger2Count', journey.passengerCount[1].count.toString());
				if (journey.passengerCount[0].benefitId) url.searchParams.set('Benefit1Id', journey.passengerCount[0].benefitId.toString());
				if (journey.passengerCount[1].benefitId) url.searchParams.set('Benefit2Id', journey.passengerCount[1].benefitId.toString());
			} else {
				url.searchParams.set('Passenger1Count', journey.passengerCount.count.toString());
				if (journey.passengerCount.benefitId) url.searchParams.set('Benefit1Id', journey.passengerCount.benefitId.toString());
			}
		}

		if (journey.bicycle) url.searchParams.set('Bicycle', 'True');
		if ('returnTrip' in journey && journey.returnTrip) {
			url.searchParams.set('ReturnTrip', 'True');
			url.searchParams.set('ReturnFromId', journey.returnFromId);
			url.searchParams.set('ReturnDepartureDate', journey.returnDepartureDate);
			if (journey.returnBicycle) url.searchParams.set('ReturnBicycle', 'True');
		}

		const response = await axios.get(url.toString()).catch((err: AxiosError) => err.response);
		if (!response || response.status !== 200) throw new Error('Failed to fetch data.');
		else if (response.data.includes('došlo je do pogreške')) throw new Error('Invalid journey data.');

		const $ = load(response.data);

		const csrfToken = $('input[name=__RequestVerificationToken]').val();
		const stateForClient = $('input[name=StateForClient]').val();
		if (!csrfToken || !stateForClient) throw new Error('Missing CSRF token or state value.');

		const processElement = (element: Element): JourneyTimetable => {
			const cells = $(element).find('.cell');

			const departureValue = $(cells[0]).text().trim();
			const departureTime = createDate(journey.departureDate, departureValue);

			const durationValue = $(cells[3]).text().trim();
			const duration = timeStringToMinutes(durationValue);

			const arrivalValue = $(cells[2]).text().trim();
			const calculatedArrivalTime = new Date(departureTime.getTime() + duration * 60000);

			let arrivalTime = createDate(journey.departureDate, arrivalValue);
			if (calculatedArrivalTime.getDate() !== departureTime.getDate() &&
				arrivalTime < departureTime) {
				arrivalTime = new Date(arrivalTime);
				arrivalTime.setDate(arrivalTime.getDate() + 1);
			}

			return {
				departureTime,
				departureNumber: $(cells[1]).find('a').text().trim(),
				arrivalTime,
				duration: $(cells[3]).text().trim(),
				transfers: parseInt($(cells[4]).text().trim(), 10),
				price: parseFloat($(cells[5]).text().trim().replace('€', '').replace(',', '.')),
				hasWarning: $(cells[5]).find('.warningIcon').length > 0,
			};
		};

		const outwardJourneys: JourneyTimetable[] = [];
		const returnJourneys: JourneyTimetable[] = [];

		$('#outwardJourneyTableContainer .item.row').each((_, element) => { outwardJourneys.push(processElement(element)); });
		$('#returnJourneyTableContainer .item.row').each((_, element) => { returnJourneys.push(processElement(element)); });

		const outputData = {
			outwardJourneys,
			returnJourneys,
			stateForClient: stateForClient.toString(),
			csrfToken: csrfToken.toString(),
			cookies: response.headers['set-cookie']?.map((cookie) => cookie.split(';')[0]).join('; ') || '',
		} satisfies InternalJourneyData;

		const parsed = JourneyRoutesInternalSchema.safeParse(outputData);
		if (!parsed.success) throw new Error(`Failed to parse journey data: ${parseZodError(parsed.error).join(', ')}.`);

		if (this.generalCache) {
			this.generalCache.set(cacheKey, parsed.data);
			this.generalCache.set(cacheKey + '_journey', journey);
		}

		return parsed.data;
	}

	public async getJourneyRouteSchedule(journey: JourneyOptions, departureNumber: string, tripType: TripTypeEnum = TripTypeEnum.Outward): Promise<JourneyRouteSchedule> {
		const journeyData = await this.getJourneyInternal(journey);
		if (!journeyData) throw new Error('Failed to fetch journey data.');

		const cacheKey = hashObject({ ...journey, departureNumber, tripType });
		if (this.generalCache && this.generalCache.has(cacheKey)) {
			const cachedData = this.generalCache.get<JourneyRouteSchedule>(cacheKey);
			if (cachedData) return cachedData;
		}

		let currentDate = new Date(journey.departureDate);

		const formData = new URLSearchParams();
		formData.append('__RequestVerificationToken', journeyData.csrfToken.toString());
		formData.append('StateForClient', journeyData.stateForClient.toString());
		formData.append('TripType', tripType);
		formData.append('DepartureNumber', departureNumber);

		const response = await axios.post(config.transportationsUrl, formData.toString(), {
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Referer': config.portalUrl,
				'Cookie': journeyData.cookies,
			},
		}).catch((err: AxiosError) => err.response);

		if (!response || response.status !== 200) throw new Error('Failed to fetch data.');
		else if (response.data.includes('došlo je do pogreške')) throw new Error('Invalid train ID or trip type.');

		const $ = load(response.data);
		const tableRows = $('#trainDetailTable tbody tr');

		const compositions: TrainDetails[] = [];
		let currentComposition: TrainDetails | null = null;

		const allStations = await this.getStations();

		const createDateWithTime = (baseDate: string | Date, timeString: string | undefined, previousDate?: Date | null): Date | null => {
			if (!timeString) return null;

			const [hours, minutes] = timeString.split(':').map(Number);
			if (hours === undefined || minutes === undefined) return null;

			const date = new Date(baseDate);
			date.setHours(hours, minutes, 0, 0);

			if (previousDate) {
				if (date < previousDate) date.setDate(date.getDate() + 1);

				// If previous time was late night (23:xx) and current is early morning (00:xx) but the date difference is more than expected (could be multi-day journey)
				const hoursDiff = (date.getTime() - previousDate.getTime()) / (1000 * 60 * 60);
				if (hoursDiff < 0 && hoursDiff > -23) date.setDate(date.getDate() + 1);
			}

			return date;
		};

		let previousDepartureTime: Date | null = null;

		tableRows.each((_, row) => {
			const $row = $(row);
			const cells = $row.find('td');
			if (cells.length === 0) return;

			const name = cells.eq(0).text().trim();
			const arrivalTime = cells.eq(1).text().trim() || undefined;
			const departureTime = cells.eq(2).text().trim() || undefined;
			const lateTime = cells.eq(3).text().trim() || undefined;
			const waitingTime = cells.eq(4).text().trim() || undefined;
			const trainNumber = cells.eq(5).text().trim();

			const infoTable = cells.eq(6).find('img');

			const features = featuresToEnum(infoTable.map((_, img) => {
				const title = $(img).attr('title');
				if (title) {
					const [text] = title.split(' - ');
					return text?.trim();
				}

				return null;
			}).get());

			const isTransfer = $row.hasClass('transfer-point');
			const isEnd = $row.hasClass('end-point');

			const stationType: CompositionTypeEnum =
				isTransfer ? arrivalTime ? CompositionTypeEnum.Transfer :
					CompositionTypeEnum.StartingPoint :
					isEnd ? CompositionTypeEnum.Destination :
						CompositionTypeEnum.Intermediate;

			const shouldCreateNewComposition =
				!currentComposition ||
				currentComposition.trainNumber !== trainNumber ||
				(isTransfer && arrivalTime);

			if (shouldCreateNewComposition) {
				if (currentComposition) compositions.push(currentComposition);

				currentComposition = {
					trainNumber,
					index: compositions.length,
					stations: [],
					features,
					shouldArriveAt: null,
					shouldDepartAt: null,
				};

				if (!isEnd && departureTime) {
					currentComposition.shouldDepartAt = createDateWithTime(currentDate, departureTime, previousDepartureTime);
					previousDepartureTime = currentComposition.shouldDepartAt;
					if (previousDepartureTime) {
						currentDate = new Date(previousDepartureTime);
					}
				}

				if (arrivalTime) {
					currentComposition.shouldArriveAt = createDateWithTime(currentDate, arrivalTime, previousDepartureTime);
				}
			}

			if (currentComposition) {
				const stationArrivalTime = (stationType === CompositionTypeEnum.StartingPoint) ? undefined :
					arrivalTime ? createDateWithTime(currentDate, arrivalTime, previousDepartureTime) || undefined : undefined;

				const stationDepartureTime = (stationType === CompositionTypeEnum.Destination) ? undefined :
					departureTime ? createDateWithTime(currentDate, departureTime, previousDepartureTime) || undefined : undefined;

				currentComposition.stations.push({
					index: currentComposition.stations.length,
					stationId: matchStationName(allStations, name)?.id || null,
					type: stationType,
					name,
					arrivalTime: stationArrivalTime,
					departureTime: stationDepartureTime,
					waitingTime,
					lateTime,
				});

				if (stationDepartureTime) {
					previousDepartureTime = stationDepartureTime;
					currentDate = new Date(stationDepartureTime);
				}

				if (isEnd && arrivalTime) {
					currentComposition.shouldArriveAt = createDateWithTime(currentDate, arrivalTime, previousDepartureTime);
				}
			}
		});

		if (currentComposition) compositions.push(currentComposition);

		const firstTrain = compositions[0] || null;
		const lastTrain = compositions[compositions.length - 1] || null;

		const firstStation = firstTrain?.stations[0] || null;
		const lastStation = lastTrain?.stations[lastTrain.stations.length - 1] || null;
		if (!firstStation || !lastStation) throw new Error('Failed to parse train composition data.');

		const fromStation = firstStation.stationId ? matchStationName(allStations, firstStation.name)?.name : firstStation.name;
		const toStation = lastStation.stationId ? matchStationName(allStations, lastStation.name)?.name : lastStation.name;
		if (!fromStation || !toStation) throw new Error('Failed to parse train composition data.');

		const shouldStartAt = firstTrain?.shouldDepartAt ? new Date(firstTrain.shouldDepartAt) : new Date(journey.departureDate);
		const shouldEndAt = lastTrain?.shouldArriveAt ? new Date(lastTrain.shouldArriveAt) : new Date(journey.departureDate);

		const totalDurationElement = $('.disclaimer-content.col-1-2 span').first();
		const totalDuration = totalDurationElement.length > 0 ? totalDurationElement.text().trim() : null;

		const transportationData = {
			departureNumber,
			trains: compositions,
			fromStation,
			toStation,
			shouldStartAt,
			shouldEndAt,
			totalDuration,
			transferDuration: formatMinutesToTime(compositions.reduce((acc, train) => {
				const trainDuration = train.stations.reduce((sum, station) => {
					if (station.waitingTime) {
						const [hours, minutes] = station.waitingTime.split(':').map(Number);
						if (hours === undefined || minutes === undefined) return sum;
						return sum + (hours * 60 + minutes);
					}
					return sum;
				}, 0);
				return acc + trainDuration;
			}, 0)),
		} satisfies JourneyRouteSchedule;

		const parsed = JourneyRouteScheduleSchema.safeParse(transportationData);
		if (!parsed.success) throw new Error(`Failed to parse train composition data: ${parseZodError(parsed.error).join(', ')}.`);

		if (this.generalCache) {
			this.generalCache.set(cacheKey, parsed.data);
			this.generalCache.set(cacheKey + '_route_schedule', journey);
		}

		return parsed.data;
	}

	public async getJourneyRouteSchedules(journey: JourneyOptions): Promise<ExtendedJourneyRoutes> {
		const { outwardJourneys, returnJourneys } = await this.getJourneyRoutes(journey);

		const outwardSchedules = await Promise.allSettled(outwardJourneys.filter((j, index, self) => {
			return self.findIndex((j2) => j2.departureNumber === j.departureNumber) === index;
		}).map((j) => {
			return this.getJourneyScheduleWithTrainInfo(journey, j.departureNumber);
		})).then((results) => {
			return results.map((result) => {
				if (result.status === 'fulfilled') return result.value;
				return null;
			}).filter((schedule) => schedule !== null) as ExtendedJourneyRouteSchedule[];
		});

		const returnSchedules = await Promise.allSettled(returnJourneys?.filter((j, index, self) => {
			return self.findIndex((j2) => j2.departureNumber === j.departureNumber) === index;
		}).map((j) => {
			return this.getJourneyScheduleWithTrainInfo(journey, j.departureNumber, TripTypeEnum.Return);
		}) || []).then((results) => {
			return results.map((result) => {
				if (result.status === 'fulfilled') return result.value;
				return null;
			}).filter((schedule) => schedule !== null) as ExtendedJourneyRouteSchedule[];
		});

		const schedules = {
			outwardJourneys: outwardSchedules.map((schedule) => {
				const details = outwardJourneys.find((j) => j.departureNumber === schedule.departureNumber);
				if (!details) throw new Error('Failed to find journey details.');

				return { schedule, details } satisfies ExtendedJourney;
			}),
			returnJourneys: returnSchedules.map((schedule) => {
				const details = returnJourneys?.find((j) => j.departureNumber === schedule.departureNumber);
				if (!details) throw new Error('Failed to find journey details.');

				return { schedule, details } satisfies ExtendedJourney;
			}),
		} satisfies ExtendedJourneyRoutes;

		const parsed = ExtendedJourneyRoutesSchema.safeParse(schedules);
		if (!parsed.success) throw new Error(`Failed to parse train composition data: ${parseZodError(parsed.error).join(', ')}.`);
		return parsed.data;
	}

	public async getTrainInfo(trainNumber: string): Promise<TrainInfo> {
		if (!this.managerConfig.authToken) throw new Error('Auth token is required to fetch train info.');

		const response = await axios.get(`${config.trainCompositionUrl}?trainId=${trainNumber}`, {
			headers: { 'Authorization': `Bearer ${this.managerConfig.authToken}` },
		}).catch((err: AxiosError) => err.response);
		if (!response || response.status !== 200) throw new Error('Failed to fetch data.');
		else if (response.data.includes('došlo je do pogreške') || response.data.includes('ne mozemo dati trazenu informaciju')) throw new Error('Invalid train ID or authToken.');

		const $ = load(response.data);

		const currentStationName = $('i:contains("Kolodvor")').next('strong').text().trim();
		const isReplacementBus = $('i:contains("autobus")').length > 0;

		let state: TrainStateEnum = TrainStateEnum.Unknown;
		let status: TrainStatusEnum = TrainStatusEnum.Unknown;
		let lateMinutes: number | undefined;

		const statusLine = $('font:contains("redovit"), font:contains("Kasni"), font:contains("polazak")').first().text().trim().toLowerCase();
		const stateText = $('font:contains("Završio"), font:contains("Odlazak"), font:contains("Dolazak"), font:contains("Formiran")').first().text().trim().toLowerCase();

		if (stateText.includes('završio')) state = TrainStateEnum.Finished;
		else if (stateText.includes('odlazak')) state = TrainStateEnum.Departure;
		else if (stateText.includes('dolazak')) state = TrainStateEnum.Arrival;
		else if (stateText.includes('formiran')) state = TrainStateEnum.Formed;

		if (statusLine.includes('redovit')) status = TrainStatusEnum.OnTime;
		else if (statusLine.includes('polazak')) status = TrainStatusEnum.WaitingDeparture;
		else if (statusLine.includes('kasni')) {
			status = TrainStatusEnum.Delayed;
			const lateTimeMatch = statusLine.match(/kasni\s+(\d+)\s+min/);
			lateMinutes = lateTimeMatch ? parseInt(lateTimeMatch[1] ?? '0', 10) : undefined;
		}

		const atTimeMatch = stateText.match(/(\d{2}\.\d{2}\.\d{2})\s+(\d{2}:\d{2})/);
		const atTime = atTimeMatch ? new Date(`${atTimeMatch[1]} ${atTimeMatch[2]}`) : new Date();

		const allStations = await this.getStations();
		const currentStation = matchStationName(allStations, currentStationName);

		const trainInfo = {
			trainNumber,
			currentStation,
			state,
			status,
			atTime,
			lateMinutes,
			isReplacementBus,
		} satisfies TrainInfo;

		const parsed = TrainInfoSchema.safeParse(trainInfo);
		if (!parsed.success) throw new Error(`Failed to parse train info data: ${parseZodError(parsed.error).join(', ')}.`);
		return parsed.data;
	}

	public async getJourneyScheduleWithTrainInfo(journey: JourneyOptions, departureNumber: string, tripType: TripTypeEnum = TripTypeEnum.Outward): Promise<ExtendedJourneyRouteSchedule> {
		if (!this.managerConfig.authToken) throw new Error('Auth token is required to fetch train info.');
		const schedule = await this.getJourneyRouteSchedule(journey, departureNumber, tripType);

		const targetDate = new Date(journey.departureDate);
		const now = new Date();

		const [hours, minutes] = journey.departureTime === 'now' ? [now.getHours(), now.getMinutes()] : journey.departureTime.split(':').map(Number);
		if (hours === undefined || minutes === undefined) throw new Error('Failed to parse train composition data.');
		targetDate.setHours(hours, minutes, 0, 0);

		const trainInfoPromises = schedule.trains.filter((train, index, self) => {
			return self.findIndex((t) => t.trainNumber === train.trainNumber) === index;
		}).map((train) => {
			const hasDeparted = train.shouldDepartAt ? train.shouldDepartAt < now : false;
			const hasArrived = train.shouldArriveAt ? train.shouldArriveAt < now : false;

			const isWithinDepartureWindow =
				train.shouldDepartAt && !hasDeparted
					? Math.abs(train.shouldDepartAt.getTime() - now.getTime()) <= this.managerConfig.minuteDeviationTrainInfo * 60 * 1000
					: false;

			const shouldSkip = (this.managerConfig.minuteDeviationTrainInfo !== -1 && !isWithinDepartureWindow) || hasArrived;
			if (shouldSkip) return null;

			return this.getTrainInfo(train.trainNumber).catch(() => null);
		});

		const trainInfoResults = await Promise.allSettled(trainInfoPromises);
		const trainsWithInfo = schedule.trains.map((train) => {
			const trainInfo = trainInfoResults.find((result) => {
				if (result.status === 'fulfilled' && result.value) return result.value.trainNumber === train.trainNumber;
				return null;
			});

			return { ...train, trainInfo: trainInfo?.status === 'fulfilled' ? trainInfo.value : null };
		});

		const extendedSchedule = {
			...schedule,
			trains: trainsWithInfo,
		} satisfies ExtendedJourneyRouteSchedule;

		const parsed = ExtendedJourneyRouteScheduleSchema.safeParse(extendedSchedule);
		if (!parsed.success) throw new Error(`Failed to parse extended train composition data: ${parseZodError(parsed.error).join(', ')}.`);
		return parsed.data;
	}

	public convertJourneyScheduleToSegments<T extends JourneyRouteSchedule>(schedule: T): ConvertToSegments<T> {
		const segments: (TrainDetails | TransferDetails)[] = [];
		let globalIndex = 0;

		schedule.trains = schedule.trains.sort((a, b) => {
			if (a.index === b.index) return 0;
			return a.index < b.index ? -1 : 1;
		});

		for (let trainIndex = 0; trainIndex < schedule.trains.length; trainIndex++) {
			const currentTrain = schedule.trains[trainIndex];
			if (!currentTrain) continue;

			if (trainIndex > 0) {
				const firstTransferStop = currentTrain.stations.find((stop) => stop.type === CompositionTypeEnum.Transfer);

				if (firstTransferStop) {
					segments.push({
						index: ++globalIndex,
						transferStation: firstTransferStop.name,
						transferStationId: firstTransferStop.stationId,
						transferToTrain: currentTrain.trainNumber,
						transferDuration: firstTransferStop.waitingTime || schedule.transferDuration,
					});
				}
			}

			segments.push({
				...currentTrain,
				index: ++globalIndex,
			});

			if (trainIndex < schedule.trains.length - 1) {
				const lastStop = currentTrain.stations[currentTrain.stations.length - 1];
				if (lastStop?.type === CompositionTypeEnum.Transfer) {
					const nextTrain = schedule.trains[trainIndex + 1];
					if (nextTrain) {
						segments.push({
							index: ++globalIndex,
							transferStation: lastStop.name,
							transferStationId: lastStop.stationId,
							transferToTrain: nextTrain.trainNumber,
							transferDuration: lastStop.waitingTime || schedule.transferDuration,
						});
					}
				}
			}
		}

		const segmented: ConvertToSegments<T> = {
			...schedule,
			segments,
		};

		const parsed = JourneyRouteScheduleSegmentsSchema.safeParse(segmented);
		if (!parsed.success) throw new Error(`Failed to parse segmented train composition data: ${parseZodError(parsed.error).join(', ')}.`);
		return parsed.data as ConvertToSegments<T>;
	}
}

export function createDate(dateString: string, timeString: string): Date {
	const date = new Date(dateString);
	const [hours, minutes] = timeString.split(':').map(Number);
	if (hours === undefined || minutes === undefined) throw new Error('Failed to parse time string.');
	date.setHours(hours, minutes, 0, 0);
	return date;
}
