export enum DiscountEnum {
	None = 0,
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

export const featureMap: Record<string, TrainFeaturesEnum> = {
	'Vagoni prvog razreda': TrainFeaturesEnum.FirstClass,
	'Vagoni drugog razreda': TrainFeaturesEnum.SecondClass,
	'Brzi vlakovi': TrainFeaturesEnum.FastTrain,
	'Vagon s mjestima za osobe s invaliditetom': TrainFeaturesEnum.WheelchairAccessible,
	'Vagon za prijevoz bicikla': TrainFeaturesEnum.BicycleTransport,
	'Putnički vlak': TrainFeaturesEnum.PassengerTrain,
	'Rezervacija moguća': TrainFeaturesEnum.ReservationPossible,
	'Rezervacija obavezna': TrainFeaturesEnum.ReservationRequired,
	'Vagon s posteljama (vagon za spavanje)': TrainFeaturesEnum.BedVagon,
};
