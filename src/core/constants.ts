export enum LanguageEnum {
	English = 'en',
	Croatian = 'hr',
}

export enum DiscountEnum {
	None = 0, // technically, this is not a discount, just empty value
	RegularSingle = 11, // only for one-way tickets
	RegularReturn = 12, // only for return tickets
	ChildAge6To12 = 13,
	Journalists = 27,
	PensionersAndSeniors = 28,
	YouthAgeTo26 = 29,
	Student = 75,
}

export enum ClassEnum {
	First = 1,
	Second = 2,
}

export enum TrainTypeEnum {
	Direct = 0,
	All = 1,
}

export enum PassengerCountEnum {
	One = 1,
	Two = 2,
	Three = 3,
	Four = 4,
	Five = 5,
	Six = 6,
}

export enum TripTypeEnum {
	Outward = 'Outward',
	Return = 'Return',
}

export enum TrainStatusEnum {
	OnTime = 0, // Vlak je redovit
	WaitingDeparture = 1, // Vlak ceka polazak
	Delayed = 2, // Kasni
	Unknown = 3,
}

export enum TrainStateEnum {
	Arrival = 0,
	Departure = 1,
	Finished = 2,
	Formed = 3,
	Unknown = 4,
}

export enum CompositionTypeEnum {
	StartingPoint = 0,
	Destination = 1,
	Intermediate = 2,
	Transfer = 3,
}

export enum TrainFeaturesEnum {
	FirstClass = 1, // "Vagoni prvog razreda" - https://prodaja.hzpp.hr/Content/images/departureDetails/1.png
	SecondClass = 2, // "Vagoni drugog razreda" - https://prodaja.hzpp.hr/Content/images/departureDetails/2.png
	FastTrain = 3, // "Brzi vlakovi" - https://prodaja.hzpp.hr/Content/images/departureDetails/TrainCat2.png
	WheelchairAccessible = 4, // "Vagon s mjestima za osobe s invaliditetom" - https://prodaja.hzpp.hr/Content/images/departureDetails/sinv.png
	BicycleTransport = 5, // "Vagon za prijevoz bicikla" - https://prodaja.hzpp.hr/Content/images/departureDetails/bike.png
	PassengerTrain = 6, // "Putnički vlak" - https://prodaja.hzpp.hr/Content/images/departureDetails/TrainCat1.png
	ReservationPossible = 7, // "Rezervacija moguća" - https://prodaja.hzpp.hr/Content/images/departureDetails/R.png
	ReservationRequired = 8, // "Rezervacija obavezna" - https://prodaja.hzpp.hr/Content/images/departureDetails/RQ.png
	CouchVagon = 9, // "vagon s ležajevima (kušet-vagon)" - https://prodaja.hzpp.hr/Content/images/departureDetails/couchette.png
	BedVagon = 10, // "Vagon s posteljama (vagon za spavanje)" - https://prodaja.hzpp.hr/Content/images/departureDetails/bed.png
	ICTrain = 11, // "IC vlakovi" - https://prodaja.hzpp.hr/Content/images/departureDetails/TrainCat3.png
}

export const discountMapHr: Record<string, DiscountEnum> = {
	'Redovna cijena': DiscountEnum.RegularSingle,
	'Povratna karta': DiscountEnum.RegularReturn,
	'Dijete 6-12 godina': DiscountEnum.ChildAge6To12,
	'Novinari': DiscountEnum.Journalists,
	'Umirovljenici ili starija osoba': DiscountEnum.PensionersAndSeniors,
	'Mladi do 26 godina': DiscountEnum.YouthAgeTo26,
	'Studenti': DiscountEnum.Student,
};

export const discountMapEn: Record<string, DiscountEnum> = {
	'Regular price': DiscountEnum.RegularSingle,
	'Return ticket': DiscountEnum.RegularReturn,
	'Child 6-12 years': DiscountEnum.ChildAge6To12,
	'Journalists': DiscountEnum.Journalists,
	'Seniors or older person': DiscountEnum.PensionersAndSeniors,
	'Youth up to 26 years': DiscountEnum.YouthAgeTo26,
	'Students': DiscountEnum.Student,
};

export const classMapHr: Record<string, ClassEnum> = {
	'1. razred': ClassEnum.First,
	'2. razred': ClassEnum.Second,
};

export const classMapEn: Record<string, ClassEnum> = {
	'1st class': ClassEnum.First,
	'2nd class': ClassEnum.Second,
};

export const trainTypeMapHr: Record<string, TrainTypeEnum> = {
	'Izravni vlak': TrainTypeEnum.Direct,
	'Svi vlakovi': TrainTypeEnum.All,
};

export const trainTypeMapEn: Record<string, TrainTypeEnum> = {
	'Direct train': TrainTypeEnum.Direct,
	'All trains': TrainTypeEnum.All,
};

export const passengerCountMapHr: Record<string, PassengerCountEnum> = Object.fromEntries(
	Object.values(PassengerCountEnum).map((value) => {
		return [`${value} putnik${Number(value) > 1 ? 'a' : ''}`, value];
	}),
) as Record<string, PassengerCountEnum>;

export const passengerCountMapEn: Record<string, PassengerCountEnum> = Object.fromEntries(
	Object.values(PassengerCountEnum).map((value) => {
		return [`${value} passenger${Number(value) > 1 ? 's' : ''}`, value];
	}),
) as Record<string, PassengerCountEnum>;

export const trainStatusMapHr: Record<string, TrainStatusEnum> = {
	'Redovit': TrainStatusEnum.OnTime,
	'Čeka polazak': TrainStatusEnum.WaitingDeparture,
	'Kasni': TrainStatusEnum.Delayed,
	'Nepoznato': TrainStatusEnum.Unknown,
};

export const trainStatusMapEn: Record<string, TrainStatusEnum> = {
	'On time': TrainStatusEnum.OnTime,
	'Waiting for departure': TrainStatusEnum.WaitingDeparture,
	'Delayed': TrainStatusEnum.Delayed,
	'Unknown': TrainStatusEnum.Unknown,
};

export const trainStateMapHr: Record<string, TrainStateEnum> = {
	'Dolazak': TrainStateEnum.Arrival,
	'Odlazak': TrainStateEnum.Departure,
	'Završeno': TrainStateEnum.Finished,
	'Formiran': TrainStateEnum.Formed,
	'Nepoznato': TrainStateEnum.Unknown,
};

export const trainStateMapEn: Record<string, TrainStateEnum> = {
	'Arrival': TrainStateEnum.Arrival,
	'Departure': TrainStateEnum.Departure,
	'Finished': TrainStateEnum.Finished,
	'Formed': TrainStateEnum.Formed,
	'Unknown': TrainStateEnum.Unknown,
};

export const compositionTypeMapHr: Record<string, CompositionTypeEnum> = {
	'Polazna točka': CompositionTypeEnum.StartingPoint,
	'Odredišna točka': CompositionTypeEnum.Destination,
	'Stajalište': CompositionTypeEnum.Intermediate,
	'Presjedanje': CompositionTypeEnum.Transfer,
};

export const compositionTypeMapEn: Record<string, CompositionTypeEnum> = {
	'Starting point': CompositionTypeEnum.StartingPoint,
	'Destination point': CompositionTypeEnum.Destination,
	'Intermediate stop': CompositionTypeEnum.Intermediate,
	'Transfer': CompositionTypeEnum.Transfer,
};

export const tripTypeMapHr: Record<string, TripTypeEnum> = {
	'Jednosmjerna karta': TripTypeEnum.Outward,
	'Povratna karta': TripTypeEnum.Return,
};

export const tripTypeMapEn: Record<string, TripTypeEnum> = {
	'One-way ticket': TripTypeEnum.Outward,
	'Return ticket': TripTypeEnum.Return,
};

export const featureMapHr: Record<string, TrainFeaturesEnum> = {
	'Vagoni prvog razreda': TrainFeaturesEnum.FirstClass,
	'Vagoni drugog razreda': TrainFeaturesEnum.SecondClass,
	'Brzi vlakovi': TrainFeaturesEnum.FastTrain,
	'Vagon s mjestima za osobe s invaliditetom': TrainFeaturesEnum.WheelchairAccessible,
	'Vagon za prijevoz bicikla': TrainFeaturesEnum.BicycleTransport,
	'Putnički vlak': TrainFeaturesEnum.PassengerTrain,
	'Rezervacija moguća': TrainFeaturesEnum.ReservationPossible,
	'Rezervacija obavezna': TrainFeaturesEnum.ReservationRequired,
	'Vagon s ležajevima (kušet-vagon)': TrainFeaturesEnum.CouchVagon,
	'Vagon s posteljama (vagon za spavanje)': TrainFeaturesEnum.BedVagon,
	'IC vlakovi': TrainFeaturesEnum.ICTrain,
} as const;

export const featureMapEn: Record<string, TrainFeaturesEnum> = {
	'First class': TrainFeaturesEnum.FirstClass,
	'Second class': TrainFeaturesEnum.SecondClass,
	'Fast trains': TrainFeaturesEnum.FastTrain,
	'Wheelchair accessible': TrainFeaturesEnum.WheelchairAccessible,
	'Bicycle transport': TrainFeaturesEnum.BicycleTransport,
	'Passenger train': TrainFeaturesEnum.PassengerTrain,
	'Reservation possible': TrainFeaturesEnum.ReservationPossible,
	'Reservation required': TrainFeaturesEnum.ReservationRequired,
	'Couch vagon': TrainFeaturesEnum.CouchVagon,
	'Bed vagon': TrainFeaturesEnum.BedVagon,
	'IC trains': TrainFeaturesEnum.ICTrain,
} as const;
