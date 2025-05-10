import { ClassEnum, CompositionTypeEnum, DiscountEnum, featureMapEn, featureMapHr, LanguageEnum, TrainFeaturesEnum, TrainStateEnum, TrainStatusEnum, TrainTypeEnum, TripTypeEnum } from './constants';
import { ExtendedJourney, ExtendedTrainDetails, JourneyOptions, ScheduledStop, Station, StationNullId, TrainInfo, ValidatedJourneyOptions } from './parsers';
import { ZodError, ZodIssue } from 'zod';
import crypto from 'crypto';

export function parseZodError(error: ZodError) {
	const errors: string[] = [];

	const formatSchemaPath = (path: (string | number)[]) => {
		return !path.length ? 'Schema' : `Schema.${path.join('.')}`;
	};

	const firstLetterToLowerCase = (str: string) => {
		return str.charAt(0).toLowerCase() + str.slice(1);
	};

	const makeSureItsString = (value: unknown) => {
		return typeof value === 'string' ? value : JSON.stringify(value);
	};

	const parseZodIssue = (issue: ZodIssue) => {
		switch (issue.code) {
			case 'invalid_type': return `${formatSchemaPath(issue.path)} must be a ${issue.expected} (invalid_type)`;
			case 'invalid_literal': return `${formatSchemaPath(issue.path)} must be a ${makeSureItsString(issue.expected)} (invalid_literal)`;
			case 'custom': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (custom)`;
			case 'invalid_union': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_union)`;
			case 'invalid_union_discriminator': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_union_discriminator)`;
			case 'invalid_enum_value': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_enum_value)`;
			case 'unrecognized_keys': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (unrecognized_keys)`;
			case 'invalid_arguments': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_arguments)`;
			case 'invalid_return_type': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_return_type)`;
			case 'invalid_date': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_date)`;
			case 'invalid_string': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_string)`;
			case 'too_small': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (too_small)`;
			case 'too_big': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (too_big)`;
			case 'invalid_intersection_types': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (invalid_intersection_types)`;
			case 'not_multiple_of': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (not_multiple_of)`;
			case 'not_finite': return `${formatSchemaPath(issue.path)} ${firstLetterToLowerCase(issue.message)} (not_finite)`;
			default: return `Schema has an unknown error (JSON: ${JSON.stringify(issue)})`;
		}
	};

	for (const issue of error.issues) {
		const parsedIssue = parseZodIssue(issue) + '.';
		if (parsedIssue) errors.push(parsedIssue);
	}

	return errors;
}

export function calculateDuration(start?: string, end?: string): string | null {
	if (!start || !end) return '';

	const [startH, startM] = start.split(':').map(Number);
	const [endH, endM] = end.split(':').map(Number);
	if (startH === undefined || startM === undefined || endH === undefined || endM === undefined) return null;

	const startMinutes = startH * 60 + startM;
	let endMinutes = endH * 60 + endM;

	if (endMinutes < startMinutes) endMinutes += 24 * 60;

	const duration = endMinutes - startMinutes;
	const hours = Math.floor(duration / 60);
	const minutes = duration % 60;

	return `${hours}:${minutes}`;
}

export function formatMinutesToTime(minutes: number) {
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function timeStringToMinutes(time: string): number {
	const [hours, minutes] = time.split(':').map(Number);
	if (hours === undefined || minutes === undefined) return 0;
	return hours * 60 + minutes;
}

export function matchStationName(stations: Station[], name: string): Station | null {
	const normalizeTokens = (input: string) =>
		input
			.toLowerCase()
			.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
			.replace(/[.,]/g, '')
			.split(/\s+/)
			.filter(Boolean);

	const inputTokens = normalizeTokens(name);

	for (const station of stations) {
		const stationTokens = normalizeTokens(station.name);

		if (
			inputTokens.length === stationTokens.length &&
			inputTokens.every((token, i) => stationTokens[i]?.startsWith(token))
		) return station;
	}

	return null;
}

export function validateJourney(journey: JourneyOptions): ValidatedJourneyOptions {
	if (journey.departureTime === 'now') journey.departureTime = new Date();

	// Date format validations
	if (!isValidDateTime(journey.departureTime)) throw new Error('Invalid departure date.');
	else if ('returnTrip' in journey && journey.returnTrip && !isValidDateTime(journey.returnDepartureTime)) throw new Error('Invalid return date.');

	// Required field validations
	else if (!journey.class) throw new Error('Class is required.');
	else if (!journey.departureTime) throw new Error('Departure time is required.');

	// Date logic validations
	else if (new Date(journey.departureTime).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)) throw new Error('Departure date cannot be in the past.');
	else if ('returnTrip' in journey && journey.returnTrip && journey.returnDepartureTime < new Date()) throw new Error('Return departure date cannot be in the past.');
	else if ('returnTrip' in journey && journey.returnTrip && journey.returnDepartureTime < journey.departureTime) throw new Error('Return departure date cannot be before the departure date.');

	// Class validation
	else if (journey.class !== 1 && journey.class !== 2) throw new Error('Invalid class. Expected 1 or 2.');

	// Station validation
	else if (journey.startId === journey.destId) throw new Error('Start and destination stations cannot be the same.');

	// Train type validation
	else if (journey.trainType !== undefined && journey.trainType !== TrainTypeEnum.Direct && journey.trainType !== TrainTypeEnum.All) throw new Error('Invalid train type. Expected 0 or 1.');

	// Passenger validations
	else if (journey.passengerCount && typeof journey.passengerCount === 'object' && !Array.isArray(journey.passengerCount) && !journey.passengerCount.count) throw new Error('Passenger count is required.');
	else if (journey.passengerCount && Array.isArray(journey.passengerCount) && journey.passengerCount.length > 2) throw new Error('Maximum of 2 passenger types are allowed.');
	else if (journey.passengerCount && Array.isArray(journey.passengerCount) && journey.passengerCount.some((passenger) => passenger.count > 6)) throw new Error('Maximum of 6 passengers are allowed.');

	// Bicycle validation
	else if (journey.bicycle && typeof journey.bicycle !== 'boolean') throw new Error('Bicycle option must be a boolean value.');
	else if ('returnTrip' in journey && journey.returnTrip && journey.returnBicycle && typeof journey.returnBicycle !== 'boolean') throw new Error('Return bicycle option must be a boolean value.');

	return {
		...journey,
		departureTime: new Date(journey.departureTime),
	};
}

export function featuresToEnum(features: string[], type: LanguageEnum = LanguageEnum.English): TrainFeaturesEnum[] {
	const lowerCaseFeatures = features.map((feature) => feature.toLowerCase());

	const enumValues = Object.entries(type === LanguageEnum.Croatian ? featureMapHr : featureMapEn).reduce((acc, [key, value]) => {
		if (lowerCaseFeatures.includes(key.toLowerCase())) acc.push(value);
		return acc;
	}, [] as TrainFeaturesEnum[]);

	return enumValues;
}

export function enumToFeatures(features: TrainFeaturesEnum[], type: LanguageEnum = LanguageEnum.English): string[] {
	const featureMapReversed = Object.entries(type === LanguageEnum.Croatian ? featureMapHr : featureMapEn).reduce((acc, [key, value]) => {
		acc[value] = key;
		return acc;
	}, {} as Record<TrainFeaturesEnum, string>);

	const featuresList = features.map((feature) => featureMapReversed[feature]);
	return featuresList;
}

export function getTrainStatus(train: TrainInfo | ExtendedTrainDetails): string {
	const status = 'status' in train ? train.status : train.trainInfo?.status;
	const lateMinutes = 'lateMinutes' in train ? train.lateMinutes : 'trainInfo' in train ? train.trainInfo?.lateMinutes : undefined;

	switch (status) {
		case TrainStatusEnum.OnTime: return 'On time';
		case TrainStatusEnum.WaitingDeparture: return 'Waiting to depart';
		case TrainStatusEnum.Delayed: return lateMinutes ? `Late ${lateMinutes} min` : 'Delayed';
		case TrainStatusEnum.Unknown:
		default: return 'Unknown';
	}
}

export function isTrainDelayed(train: TrainInfo | ExtendedTrainDetails): boolean {
	const status = 'status' in train ? train.status : train.trainInfo?.status;
	return status === TrainStatusEnum.Delayed;
}

export function isTrainOnTime(train: TrainInfo | ExtendedTrainDetails): boolean {
	const status = 'status' in train ? train.status : train.trainInfo?.status;
	return status === TrainStatusEnum.OnTime;
}

export function getTrainState(train: TrainInfo | { trainInfo: TrainInfo }): string {
	const state = 'state' in train ? train.state : train.trainInfo?.state;

	switch (state) {
		case TrainStateEnum.Arrival: return 'Arriving';
		case TrainStateEnum.Departure: return 'Departing';
		case TrainStateEnum.Finished: return 'Finished';
		case TrainStateEnum.Formed: return 'Formed';
		case TrainStateEnum.Unknown:
		default: return 'Unknown state';
	}
}

export function getStopType(stop: ScheduledStop): string {
	switch (stop.type) {
		case CompositionTypeEnum.StartingPoint: return 'Departure station';
		case CompositionTypeEnum.Destination: return 'Destination station';
		case CompositionTypeEnum.Intermediate: return stop.stationId ? 'Stop' : 'Passing through';
		case CompositionTypeEnum.Transfer: return 'Transfer point';
		default: return 'Unknown stop type';
	}
}

export function getDiscountName(discount: DiscountEnum): string {
	switch (discount) {
		case DiscountEnum.None: return 'No discount';
		case DiscountEnum.RegularSingle: return 'Regular (one-way)';
		case DiscountEnum.RegularReturn: return 'Regular (return)';
		case DiscountEnum.ChildAge6To12: return 'Child (6-12)';
		case DiscountEnum.Journalists: return 'Journalist';
		case DiscountEnum.PensionersAndSeniors: return 'Pensioner/Senior';
		case DiscountEnum.YouthAgeTo26: return 'Youth (<26)';
		case DiscountEnum.Student: return 'Student';
		default: return 'Unknown discount';
	}
}

export function getClassLabel(classEnum: ClassEnum): string {
	switch (classEnum) {
		case ClassEnum.First: return 'First class';
		case ClassEnum.Second: return 'Second class';
		default: return 'Unknown class';
	}
}

export function getTripTypeLabel(tripType: TripTypeEnum): string {
	switch (tripType) {
		case TripTypeEnum.Outward: return 'Outbound trip';
		case TripTypeEnum.Return: return 'Return trip';
		default: return 'Unknown trip type';
	}
}

export function calculateJourneyPercentage(journey: ExtendedJourney, currentTime: Date = new Date()): number {
	const currentTrain = getCurrentTrain(journey, currentTime);

	if (!currentTrain) {
		const journeyEndTime = getDelayedTimeFromScheduled(journey.details.arrivalTime, journey).getTime();
		return currentTime.getTime() >= journeyEndTime ? 100 : 0;
	}

	if (!currentTrain.trainInfo || !currentTrain.trainInfo.currentStation) return calculateTimeBasedPercentage(journey, currentTime);

	const allStations = getAllJourneyStations(journey);
	const currentStationId = currentTrain.trainInfo.currentStation.id;

	const currentStationIndex = allStations.findIndex((s) => s.id === currentStationId);
	if (currentStationIndex === -1) return calculateTimeBasedPercentage(journey, currentTime);

	const stationPercentage = allStations.length > 1 ? (currentStationIndex / (allStations.length - 1)) * 100 : 0;

	const delayedDeparture = getDelayedTimeFromScheduled(currentTrain.shouldDepartAt, journey);
	const delayedArrival = getDelayedTimeFromScheduled(currentTrain.shouldArriveAt, journey);

	const trainTotalDuration = delayedArrival.getTime() - delayedDeparture.getTime();
	const timeElapsed = currentTime.getTime() - delayedDeparture.getTime();

	let segmentPercentage = 0;
	if (trainTotalDuration > 0 && timeElapsed > 0) {
		segmentPercentage = Math.min(100, (timeElapsed / trainTotalDuration) * 100);
	}

	return Math.min(100, stationPercentage + (segmentPercentage / allStations.length));
}

export function calculateTimeBasedPercentage(journey: ExtendedJourney, currentTime: Date = new Date()): number {
	const journeyStart = getDelayedTimeFromScheduled(journey.details.departureTime, journey).getTime();
	const journeyEnd = getDelayedTimeFromScheduled(journey.details.arrivalTime, journey).getTime();
	const now = currentTime.getTime();

	if (now <= journeyStart) return 0;
	if (now >= journeyEnd) return 100;

	const totalDuration = journeyEnd - journeyStart;
	const elapsed = now - journeyStart;

	return Math.min(100, (elapsed / totalDuration) * 100);
}

export function getDelayedTimeFromScheduled(scheduledTime: Date | null | undefined, journey: ExtendedJourney): Date {
	if (!scheduledTime) return new Date(0);

	let maxDelayMinutes = 0;
	for (const train of journey.schedule.trains) {
		if (train.trainInfo?.lateMinutes && train.trainInfo.lateMinutes > maxDelayMinutes) {
			maxDelayMinutes = train.trainInfo.lateMinutes;
		}
	}

	const delayedTime = new Date(scheduledTime);
	delayedTime.setMinutes(delayedTime.getMinutes() + maxDelayMinutes);
	return delayedTime;
}

export function getAllJourneyStations(journey: ExtendedJourney): StationNullId[] {
	const stations: StationNullId[] = [];
	let globalIndex = 0;

	for (const train of journey.schedule.trains) {
		for (const station of train.stations) {
			if (stations.some((s) => s.id === station.stationId)) continue;

			stations.push({
				index: globalIndex++,
				id: station.stationId,
				name: station.name,
			});
		}
	}

	return stations;
}

export function getCurrentTrain(journey: ExtendedJourney, currentTime: Date = new Date()): ExtendedTrainDetails | null {
	for (const train of journey.schedule.trains) {
		if (!train.trainInfo) continue;

		const shouldDepartAt = train.shouldDepartAt?.getTime() ?? 0;
		const shouldArriveAt = train.shouldArriveAt?.getTime() ?? 0;
		const lateDeparture = shouldDepartAt + (train.trainInfo.lateMinutes ?? 0) * 60 * 1000;
		const lateArrival = shouldArriveAt + (train.trainInfo.lateMinutes ?? 0) * 60 * 1000;

		if (currentTime.getTime() >= lateDeparture && currentTime.getTime() <= lateArrival) return train;
	}

	return null;
}

export function hashObject(obj: Record<string, unknown>): string {
	const hash = crypto.createHash('sha1');
	hash.update(JSON.stringify(obj));
	return hash.digest('hex');
}

export function dateToDateTime(date: Date): { date: string; time: string } {
	const formattedDate = date.toISOString().split('T')[0];
	const formattedTime = date.toTimeString().split(' ')[0]?.slice(0, 5);
	if (!formattedDate || !formattedTime) throw new Error('Invalid date or time format.');

	return { date: formattedDate, time: formattedTime };
}

export function isValidDateTime(date: Date): boolean {
	const parsedDate = new Date(date);
	return !isNaN(parsedDate.getTime());
}
