import { ClassEnum, CompositionTypeEnum, DiscountEnum, PassengerCountEnum, TrainStatusEnum, TrainStateEnum, TrainTypeEnum, TrainFeaturesEnum } from './constants';
import z from 'zod';

export type Station = z.infer<typeof StationSchema>;
export type StationNullId = Omit<Station, 'id'> & { id: string | null; index: number; };
export const StationSchema = z.object({
	id: z.string(),
	name: z.string(),
});

export type RollingStockInfo = z.infer<typeof RollingStockInfoSchema>;
export const RollingStockInfoSchema = z.object({
	name: z.string(),
	image: z.string().url(),
});

export type DateString = z.infer<typeof DateStringSchema>;
export type DateTimeString = z.infer<typeof DateTimeSchema>;
export const DateTimeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format. Expected HH:mm');
export const DateStringSchema = z.preprocess((arg) => {
	const date = new Date(arg as string | Date);
	return isNaN(date.getTime()) ? undefined : date;
}, z.date());

export type PassengerCount = z.infer<typeof PassengerCountSchema>;
export const PassengerCountSchema = z.object({
	count: z.nativeEnum(PassengerCountEnum),
	benefitId: z.nativeEnum(DiscountEnum),
});

export type OneWayJourneyInput = z.infer<typeof JourneyOptionsOneWaySchema>;
export const JourneyOptionsOneWaySchema = z.object({
	startId: z.string(),
	destId: z.string(),
	viaId: z.string().optional(),

	class: z.nativeEnum(ClassEnum),
	trainType: z.nativeEnum(TrainTypeEnum),

	departureTime: z.union([DateStringSchema, z.literal('now')]).refine((value) => {
		if (value === 'now') return true;
		else if (value instanceof Date) return !isNaN(value.getTime());
		else return false;
	}, 'Invalid time format. Expected date or "now".'),
	passengerCount: z.tuple([PassengerCountSchema]).or(z.tuple([PassengerCountSchema, PassengerCountSchema])),

	bicycle: z.boolean().optional(),
});

export type ReturnJourneyInput = z.infer<typeof JourneyOptionsReturnSchema>;
export const JourneyOptionsReturnSchema = JourneyOptionsOneWaySchema.extend({
	returnFromId: z.string(),
	returnDepartureTime: DateStringSchema,

	returnTrip: z.boolean(),
	returnBicycle: z.boolean().optional(),
});

export type JourneyOptions = z.infer<typeof JourneyOptionsSchema>;
export const JourneyOptionsSchema = z.union([
	JourneyOptionsOneWaySchema,
	JourneyOptionsReturnSchema,
]);

export type JourneyTimetable = z.infer<typeof JourneyTimetableSchema>;
export const JourneyTimetableSchema = z.object({
	departureTime: DateStringSchema,
	departureNumber: z.string(),
	arrivalTime: DateStringSchema,
	duration: DateTimeSchema,
	transfers: z.number(),
	price: z.number(),
	hasWarning: z.boolean().optional(),
});

export type JourneyRoutes = z.infer<typeof JourneyRoutesSchema>;
export const JourneyRoutesSchema = z.object({
	outwardJourneys: z.array(JourneyTimetableSchema),
	returnJourneys: z.array(JourneyTimetableSchema).optional(),
});

export type InternalJourneyData = z.infer<typeof JourneyRoutesInternalSchema>;
export const JourneyRoutesInternalSchema = JourneyRoutesSchema.extend({
	stateForClient: z.string(),
	csrfToken: z.string(),
	cookies: z.string(),
});

export type ScheduledStop = z.infer<typeof ScheduledStopSchema>;
export const ScheduledStopSchema = z.object({
	index: z.number(),
	name: z.string(),
	stationId: z.string().nullable(),
	arrivalTime: DateStringSchema.optional(),
	departureTime: DateStringSchema.optional(),
	waitingTime: DateTimeSchema.optional(),
	lateTime: DateTimeSchema.optional(),
	type: z.nativeEnum(CompositionTypeEnum),
});

export type TrainInfo = z.infer<typeof TrainInfoSchema>;
export const TrainInfoSchema = z.object({
	trainNumber: z.string(),
	currentStation: StationSchema.nullable(),

	isReplacementBus: z.boolean().optional().default(false),

	atTime: DateStringSchema, // departure time/formed time/finished time
	lateMinutes: z.number().optional(),

	state: z.nativeEnum(TrainStateEnum),
	status: z.nativeEnum(TrainStatusEnum),
});

export type TrainDetails = z.infer<typeof TrainDetailsSchema>;
export const TrainDetailsSchema = z.object({
	index: z.number(),
	trainNumber: z.string(),

	shouldDepartAt: DateStringSchema.nullable(),
	shouldArriveAt: DateStringSchema.nullable(),

	features: z.array(z.nativeEnum(TrainFeaturesEnum)),
	stations: z.array(ScheduledStopSchema),
});

export type TransferDetails = z.infer<typeof TransferDetailsSchema>;
export const TransferDetailsSchema = z.object({
	index: z.number(),
	transferToTrain: z.string(),
	transferDuration: z.string().nullable(),

	transferStation: z.string(),
	transferStationId: z.string().nullable(),
});

export type ExtendedTrainDetails = z.infer<typeof ExtendedTrainDetailsSchema>;
export const ExtendedTrainDetailsSchema = TrainDetailsSchema.extend({
	trainInfo: TrainInfoSchema.nullable(),
});

export type JourneyRouteSchedule = z.infer<typeof JourneyRouteScheduleSchema>;
export const JourneyRouteScheduleSchema = z.object({
	departureNumber: z.string(),

	fromStation: z.string(),
	toStation: z.string(),

	shouldStartAt: DateStringSchema,
	shouldEndAt: DateStringSchema,

	trains: z.array(TrainDetailsSchema),

	totalDuration: DateTimeSchema.nullable(),
	transferDuration: DateTimeSchema.nullable(),
});

export type JourneyRouteScheduleSegments = z.infer<typeof JourneyRouteScheduleSegmentsSchema>;
export const JourneyRouteScheduleSegmentsSchema = JourneyRouteScheduleSchema.omit({
	trains: true,
}).extend({
	segments: z.array(z.union([TrainDetailsSchema, TransferDetailsSchema])),
});

export type ExtendedJourneyRouteSchedule = z.infer<typeof ExtendedJourneyRouteScheduleSchema>;
export const ExtendedJourneyRouteScheduleSchema = JourneyRouteScheduleSchema.omit({
	trains: true,
}).extend({
	trains: z.array(ExtendedTrainDetailsSchema),
});

export type ExtendedJourney = z.infer<typeof ExtendedJourneySchema>;
export const ExtendedJourneySchema = z.object({
	details: JourneyTimetableSchema,
	schedule: ExtendedJourneyRouteScheduleSchema,
});

export type ExtendedJourneyRoutes = z.infer<typeof ExtendedJourneyRoutesSchema>;
export const ExtendedJourneyRoutesSchema = z.object({
	outwardJourneys: z.array(ExtendedJourneySchema),
	returnJourneys: z.array(ExtendedJourneySchema).optional(),
});

export type ValidatedJourneyOptions = z.infer<typeof ValidatedJourneyOptionsSchema>;
export const ValidatedJourneyOptionsSchema = z.union([
	JourneyOptionsOneWaySchema.omit({ departureTime: true }).extend({
		departureTime: DateStringSchema,
	}),
	JourneyOptionsReturnSchema.omit({ departureTime: true, returnDepartureTime: true }).extend({
		departureTime: DateStringSchema,
		returnDepartureTime: DateStringSchema,
	}),
]);

export type ConvertToSegments<T extends JourneyRouteSchedule> = Omit<T, 'trains'> & {
	segments: (TrainDetails | TransferDetails)[];
};

export type ExtendedJourneyRoutesWithSegments<T extends ExtendedJourneyRoutes> = {
	[K in keyof T]: T[K] extends Array<infer Route>
	? Array<ConvertToSegments<Route & JourneyRouteSchedule>>
	: never;
};
